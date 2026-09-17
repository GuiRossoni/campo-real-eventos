import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'full' | 'short';
  showText?: boolean;
  className?: string;
}

export default function Logo({ 
  variant = 'full', 
  showText = true, 
  className = '', 
  ...props 
}: LogoProps) {
  if (variant === 'short') {
    return (
      <svg 
        viewBox="140 20 350 460" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMinYMid meet"
        className={`transform hover:rotate-6 transition-transform duration-300 select-none ${className}`}
        {...props}
      >
        {/* Estrela estilizada dourada/amarela do logotipo da Campo Real */}
        <path 
          d="M 265 25 L 338 170 L 480 131 L 370 260 L 455 415 L 318 330 L 227 471 L 245 335 L 160 285 L 240 200 Z" 
          stroke="#FACC15" 
          strokeWidth="16" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none"
        />
        
        {showText && (
          /* Texto EVENTOS (rosa vibrante no logotipo) */
          <text 
            x="30" 
            y="295" 
            fill="#d11c7d" 
            fontSize="105px" 
            fontFamily="'Inter', -apple-system, sans-serif" 
            fontWeight="900" 
            letterSpacing="-3px"
          >
            EVENTOS
          </text>
        )}
      </svg>
    );
  }

  // Versão completa (CAMPO REAL + EVENTOS e Estrela)
  return (
    <svg 
      viewBox="20 15 470 465" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMinYMid meet"
      className={`transform hover:scale-102 transition-transform duration-300 select-none ${className}`}
      {...props}
    >
      {/* Estrela estilizada dourada/amarela do logotipo da Campo Real */}
      <path 
        d="M 265 25 L 338 170 L 480 131 L 370 260 L 455 415 L 318 330 L 227 471 L 245 335 L 160 285 L 240 200 Z" 
        stroke="#FACC15" 
        strokeWidth="15" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {showText && (
        <>
          {/* Texto CAMPO REAL (azul no logotipo) */}
          <text 
            x="30" 
            y="180" 
            fill="#007ebb" 
            fontSize="54px" 
            fontFamily="'Inter', -apple-system, sans-serif" 
            fontWeight="800" 
            letterSpacing="1px"
          >
            CAMPO REAL
          </text>
          
          {/* Texto EVENTOS (rosa vibrante no logotipo) */}
          <text 
            x="30" 
            y="295" 
            fill="#d11c7d" 
            fontSize="105px" 
            fontFamily="'Inter', -apple-system, sans-serif" 
            fontWeight="900" 
            letterSpacing="-3px"
          >
            EVENTOS
          </text>
        </>
      )}
    </svg>
  );
}
