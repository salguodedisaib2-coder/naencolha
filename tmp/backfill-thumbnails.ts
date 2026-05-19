import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing backend env vars')

const supabase = createClient(supabaseUrl, serviceRoleKey)

const extractBucketPath = (fileUrl: string, bucket: string) => {
  const directMarker = `/storage/v1/object/public/${bucket}/`
  const signedMarker = `/storage/v1/object/sign/${bucket}/`
  if (fileUrl.includes(directMarker)) return fileUrl.split(directMarker)[1]?.split('?')[0] ?? ''
  if (fileUrl.includes(signedMarker)) return fileUrl.split(signedMarker)[1]?.split('?')[0] ?? ''
  return ''
}

const run = async (cmd: string[]) => {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (exitCode !== 0) throw new Error(stderr.trim() || stdout.trim() || `${cmd[0]} failed`)
  return stdout.trim()
}

const { data: videos, error } = await supabase
  .from('videos')
  .select('id, creator_id, title, video_url, thumbnail_url')
  .is('thumbnail_url', null)
  .order('created_at', { ascending: false })

if (error) throw error

for (const video of videos ?? []) {
  const path = extractBucketPath(video.video_url, 'videos')
  if (!path) {
    console.log(`skip:${video.id}:path-not-found`)
    continue
  }

  const { data: signed, error: signError } = await supabase.storage.from('videos').createSignedUrl(path, 600)
  if (signError || !signed?.signedUrl) {
    console.log(`skip:${video.id}:signed-url-failed`)
    continue
  }

  const probe = await run([
    'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', signed.signedUrl,
  ]).catch(() => '2')

  const duration = Number.parseFloat(probe)
  const seek = Number.isFinite(duration) && duration > 0.25
    ? Math.max(0.1, Math.min(duration - 0.1, duration * 0.18))
    : 0.1

  const outputPath = `/tmp/${video.id}.jpg`
  await run(['ffmpeg', '-y', '-ss', String(seek), '-i', signed.signedUrl, '-frames:v', '1', '-q:v', '2', outputPath])

  const image = await readFile(outputPath)
  const storagePath = `${video.creator_id}/${video.id}-${Date.now()}.jpg`
  const { error: uploadError } = await supabase.storage.from('thumbnails').upload(storagePath, image, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (uploadError) {
    console.log(`skip:${video.id}:upload-failed:${uploadError.message}`)
    continue
  }

  const { data: publicData } = supabase.storage.from('thumbnails').getPublicUrl(storagePath)
  const { error: updateError } = await supabase.from('videos').update({ thumbnail_url: publicData.publicUrl }).eq('id', video.id)
  if (updateError) {
    console.log(`skip:${video.id}:update-failed:${updateError.message}`)
    continue
  }

  console.log(`ok:${video.id}`)
}
