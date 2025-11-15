export function Logo() {
  return (
    <div className="relative h-40 w-40">
      {/* Blue quarter circle - bottom left */}
      <div className="absolute bottom-0 left-0 h-16 w-16 rounded-tl-full bg-gray-400" />
      
      {/* Dark blue square - center */}
      <div className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 bg-black" />
      
      {/* Red quarter circle - top right */}
      <div className="absolute right-4 top-0 h-16 w-16 rounded-tr-full bg-gray-700" />
      
      {/* Green quarter circle - middle right */}
      <div className="absolute right-0 top-1/2 h-16 w-16 -translate-y-1/2 translate-x-4 rounded-br-full bg-gray-300" />
    </div>
  )
}
