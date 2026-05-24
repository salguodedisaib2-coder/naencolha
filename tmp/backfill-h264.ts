import { createClient } from '@supabase/supabase-js'
import { readFile, unlink } from 'node:fs/promises'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing backend env vars')

const supabase = createClient(supabaseUrl, serviceRoleKey)

const extractPath = (fileUrl: string, bucket: string) => {
  const direct = `/storage/v1/object/public/${bucket}/`
  const signed = `/storage/v1/object/sign/${bucket}/`
  if (fileUrl.includes(direct)) return fileUrl.split(direct)[1]?.split('?')[0] ?? ''
  if (fileUrl.includes(signed)) return fileUrl.split(signed)[1]?.split('?')[0] ?? ''
  return ''
}

const run = async (cmd: string[]) => {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) throw new Error(stderr.trim() || stdout.trim() || `${cmd[0]} failed`)
  return stdout.trim()
}

const { data: videos, error } = await supabase
  .from('videos')
  .select('id, creator_id, video_url')
  .not('video_url', 'is', null)
  .order('created_at', { ascending: false })

if (error) throw error

for (const v of videos ?? []) {
  const path = extractPath(v.video_url as string, 'videos')
  if (!path) { console.log(`skip:${v.id}:no-path`); continue }

  const { data: signed, error: signErr } = await supabase.storage.from('videos').createSignedUrl(path, 1200)
  if (signErr || !signed?.signedUrl) { console.log(`skip:${v.id}:sign-failed`); continue }

  const codec = await run([
    'ffprobe', '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name', '-of', 'default=nokey=1:noprint_wrappers=1',
    signed.signedUrl,
  ]).catch(() => '')

  if (codec.toLowerCase() !== 'hevc' && codec.toLowerCase() !== 'h265') {
    console.log(`ok-skip:${v.id}:${codec || 'unknown'}`)
    continue
  }

  console.log(`convert:${v.id}:hevc→h264`)
  const outPath = `/tmp/${v.id}_h264.mp4`
  await run([
    'ffmpeg', '-y', '-i', signed.signedUrl,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
    outPath,
  ])

  const buf = await readFile(outPath)
  const newPath = path.replace(/\.[^.]+$/, '') + `_h264_${Date.now()}.mp4`
  const { error: upErr } = await supabase.storage.from('videos').upload(newPath, buf, {
    contentType: 'video/mp4', upsert: false,
  })
  await unlink(outPath).catch(() => {})
  if (upErr) { console.log(`skip:${v.id}:upload-failed:${upErr.message}`); continue }

  const { data: pub } = supabase.storage.from('videos').getPublicUrl(newPath)
  const { error: updErr } = await supabase.from('videos').update({ video_url: pub.publicUrl }).eq('id', v.id)
  if (updErr) { console.log(`skip:${v.id}:db-update-failed:${updErr.message}`); continue }

  await supabase.storage.from('videos').remove([path]).catch(() => {})
  console.log(`done:${v.id}`)
}
