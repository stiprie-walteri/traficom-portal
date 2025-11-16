export function ChessLoader({ duration = 3 }: { duration?: number }) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
      <div className="flex flex-col items-center gap-6">
        <div className="chess-board">
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8)
          const col = index % 8
          const isBlack = (row + col) % 2 === 0
          
          return (
            <div
              key={index}
              className={`chess-square ${isBlack ? 'chess-square-black' : 'chess-square-white'}`}
              style={{
                animationDelay: `${index * 0.02}s`
              }}
            />
          )
        })}
      </div>
      
      <div className="w-64 flex flex-col items-center gap-2">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-black rounded-full"
            style={{
              animation: `progressBar ${duration}s linear forwards`
            }}
          />
        </div>
        <p className="text-sm text-gray-600">This may take a while...</p>
      </div>
      </div>
      
      <style>{`
        .chess-board {
          display: grid;
          grid-template-columns: repeat(8, 30px);
          grid-template-rows: repeat(8, 30px);
          gap: 2px;
        }

        .chess-square {
          width: 30px;
          height: 30px;
          animation: chessAnimation 3s ease-in-out infinite;
          opacity: 0;
        }

        .chess-square-black {
          background: black;
        }

        .chess-square-white {
          background: white;
          border: 2px solid black;
        }

        @keyframes chessAnimation {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          20% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          63% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          83% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
          100% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
        }
        
        @keyframes progressBar {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export function ChessLoaderLong() {
  return <ChessLoader duration={10} />
}
