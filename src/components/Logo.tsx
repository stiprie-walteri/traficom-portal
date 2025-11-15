import logoPng from '@/assets/logo.png'

export function Logo() {
  return (
    <div className="h-40 w-40">
      <img src={logoPng} alt="Logo" className="h-full w-full object-contain object-left" />
    </div>
  )
}
