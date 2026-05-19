import logo from "@/assets/logo.png";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-10 w-auto" }: LogoProps) {
  return <img src={logo} alt="NaEncolha" className={className} />;
}
