import React from 'react'

/**
 * 翻转组件
 * @param {*} props
 * @returns
 */
export default function FlipCard(props) {
  const [isFlipped, setIsFlipped] = useState(false)

  function handleMouseEnter() {
    setIsFlipped(true)
  }

  function handleMouseLeave() {
    setIsFlipped(false)
  }

  return (
        <div 
          className={`flip-card ${isFlipped ? 'flipped' : ''}`} 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
            <div className={`flip-card-front ${props.className || ''}`}>
                {props.frontContent}
            </div>
            <div className={`flip-card-back ${props.className || ''}`}>
                {props.backContent}
            </div>
            <style jsx>{`
          .flip-card {
            width: 100%;
            height: 100%;
            display: inline-block;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.2s;
          }
          
          .flip-card-front,
          .flip-card-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
          }
          
          .flip-card-front {
            z-index: 2;
            transform: rotateY(0);
          }
          
          .flip-card-back {
            transform: rotateY(180deg);
          }
          
          .flip-card.flipped {
            transform: rotateY(180deg);
          }
        `}</style>
        </div>
      </div>
      <style jsx>{`
        .flip-card {
          width: 100%;
          height: 100%;
          display: inline-block;
          position: relative;
          perspective: 1200px;
          isolation: isolate;
        }

        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          overflow: hidden;
        }

        .flip-card-front {
          z-index: 2;
          transform: rotateY(0deg) translateZ(1px);
          -webkit-transform: rotateY(0deg) translateZ(1px);
          pointer-events: auto;
        }

        .flip-card-back {
          transform: rotateY(180deg) translateZ(1px);
          -webkit-transform: rotateY(180deg) translateZ(1px);
          z-index: 3;
          pointer-events: none;
        }

        .flip-card:hover .flip-card-inner {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }

        .flip-card:hover .flip-card-front {
          pointer-events: none;
        }

        .flip-card:hover .flip-card-back {
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
