import logoSvg from '@/assets/logo.svg'

export function Logo() {
  return (
    <div className="h-25 w-75">
      <img src={logoSvg} alt="Logo" className="h-full w-full object-contain object-left" />
    </div>
  )
}
