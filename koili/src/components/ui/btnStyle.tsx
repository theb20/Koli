import styled from "styled-components";

type ButtonProps = {
  text?: string;
  loadingText?: string;
  loading?: boolean;
  icon?: string;
  onClick?: () => void;
};

const Button = ({
  text = "Generate",
  loadingText = "Generating",
  loading = false,
  icon,
  onClick,
}: ButtonProps) => {
  const renderLetters = (value: string) =>
    value.split("").map((letter, index) => (
      <span key={index} className="btn-letter">
        {letter === " " ? "\u00A0" : letter}
      </span>
    ));

  return (
    <StyledWrapper>
      <div className="btn-wrapper w-full">
        <button className="btn w-full flex items-center justify-center" onClick={onClick}>
          {icon || (
            <svg className="btn-svg" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"></path><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"></path><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"></path><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"></path></g></svg>
          )}

          <div className="txt-wrapper">
            <div className="txt-1">{renderLetters(text)}</div>

            <div className="txt-2">
              {renderLetters(loading ? loadingText : text)}
            </div>
          </div>
        </button>
      </div>
    </StyledWrapper>
  );
};


const StyledWrapper = styled.div`
  .btn-wrapper {
    position: relative;
    display: inline-block;
  }

  .btn {
    --border-radius: 24px;
    --padding: 4px;
    --transition: 0.4s;
    --button-color: #101010; /* Same as background */
    --highlight-color-hue: 210deg;

    user-select: none;
    display: flex;
    justify-content: center;
    padding: 0.5em 0.5em 0.5em 1.1em;
    font-family: "Poppins", "Inter", "Segoe UI", sans-serif;
    font-size: 1em;
    font-weight: 400;

    background-color: var(--button-color);

    box-shadow:
      /* inset */
      inset 0px 1px 1px rgba(255, 255, 255, 0.2),
      inset 0px 2px 2px rgba(255, 255, 255, 0.15),
      inset 0px 4px 4px rgba(255, 255, 255, 0.1),
      inset 0px 8px 8px rgba(255, 255, 255, 0.05),
      inset 0px 16px 16px rgba(255, 255, 255, 0.05),
      /* drop */ 0px -1px 1px rgba(0, 0, 0, 0.02),
      0px -2px 2px rgba(0, 0, 0, 0.03),
      0px -4px 4px rgba(0, 0, 0, 0.05),
      0px -8px 8px rgba(0, 0, 0, 0.06),
      0px -16px 16px rgba(0, 0, 0, 0.08);

    border: solid 1px #fff2;
    border-radius: var(--border-radius);
    cursor: pointer;

    transition:
      box-shadow var(--transition),
      border var(--transition),
      background-color var(--transition);
  }
  .btn::before {
    content: "";
    position: absolute;
    top: calc(0px - var(--padding));
    left: calc(0px - var(--padding));
    width: calc(100% + var(--padding) * 2);
    height: calc(100% + var(--padding) * 2);
    border-radius: calc(var(--border-radius) + var(--padding));
    pointer-events: none;
    background-image: linear-gradient(0deg, #0004, #000a);

    z-index: -1;
    transition:
      box-shadow var(--transition),
      filter var(--transition);
    box-shadow:
      0 -8px 8px -6px #0000 inset,
      0 -16px 16px -8px #00000000 inset,
      1px 1px 1px #fff2,
      2px 2px 2px #fff1,
      -1px -1px 1px #0002,
      -2px -2px 2px #0001;
  }
  .btn::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    pointer-events: none;
    background-image: linear-gradient(
      0deg,
      #fff,
      hsl(var(--highlight-color-hue), 100%, 70%),
      hsla(var(--highlight-color-hue), 100%, 70%, 50%),
      8%,
      transparent
    );
    background-position: 0 0;
    opacity: 0;
    transition:
      opacity var(--transition),
      filter var(--transition);
  }

  .btn-letter {
    position: relative;
    display: inline-block;
    color: #fff5;
    animation: letter-anim 2s ease-in-out infinite;
    transition:
      color var(--transition),
      text-shadow var(--transition),
      opacity var(--transition);
  }

  @keyframes letter-anim {
    50% {
      text-shadow: 0 0 3px #fff8;
      color: #fff;
    }
  }

  .btn-svg {
    flex-grow: ;
    height: 24px;
    margin-right: 0.5rem;
    fill: #e8e8e8;
    animation: flicker 2s linear infinite;
    animation-delay: 0.5s;
    filter: drop-shadow(0 0 2px #fff9);
    transition:
      fill var(--transition),
      filter var(--transition),
      opacity var(--transition);
  }
  @keyframes flicker {
    50% {
      opacity: 0.3;
    }
  }

  /* Focus state */
  .txt-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 6.4em;
  }
  .txt-1,
  .txt-2 {
    position: absolute;
    word-spacing: -1em;
  }
  .txt-1 {
    animation: appear-anim 1s ease-in-out forwards;
  }
  .txt-2 {
    opacity: 0;
  }
  @keyframes appear-anim {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  .btn:focus .txt-1 {
    animation: opacity-anim 0.3s ease-in-out forwards;
    animation-delay: 1s;
  }
  .btn:focus .txt-2 {
    animation: opacity-anim 0.3s ease-in-out reverse forwards;
    animation-delay: 1s;
  }
  @keyframes opacity-anim {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .btn:focus .btn-letter {
    animation:
      focused-letter-anim 1s ease-in-out forwards,
      letter-anim 1.2s ease-in-out infinite;
    animation-delay: 0s, 1s;
  }
  @keyframes focused-letter-anim {
    0%,
    100% {
      filter: blur(0px);
    }
    50% {
      transform: scale(2);
      filter: blur(10px) brightness(150%)
        drop-shadow(-36px 12px 12px hsl(var(--highlight-color-hue), 100%, 70%));
    }
  }
  .btn:focus .btn-svg {
    animation-duration: 1.2s;
    animation-delay: 0.2s;
  }

  .btn:focus::before {
    box-shadow:
      0 -8px 12px -6px #fff3 inset,
      0 -16px 16px -8px hsla(var(--highlight-color-hue), 100%, 70%, 20%) inset,
      1px 1px 1px #fff3,
      2px 2px 2px #fff1,
      -1px -1px 1px #0002,
      -2px -2px 2px #0001;
  }
  .btn:focus::after {
    opacity: 0.6;
    mask-image: linear-gradient(0deg, #fff, transparent);
    filter: brightness(100%);
  }

  /* Animation delays for .btn-letter elements */
  .btn-letter:nth-child(1),
  .btn:focus .btn-letter:nth-child(1) {
    animation-delay: 0s;
  }
  .btn-letter:nth-child(2),
  .btn:focus .btn-letter:nth-child(2) {
    animation-delay: 0.08s;
  }
  .btn-letter:nth-child(3),
  .btn:focus .btn-letter:nth-child(3) {
    animation-delay: 0.16s;
  }
  .btn-letter:nth-child(4),
  .btn:focus .btn-letter:nth-child(4) {
    animation-delay: 0.24s;
  }
  .btn-letter:nth-child(5),
  .btn:focus .btn-letter:nth-child(5) {
    animation-delay: 0.32s;
  }
  .btn-letter:nth-child(6),
  .btn:focus .btn-letter:nth-child(6) {
    animation-delay: 0.4s;
  }
  .btn-letter:nth-child(7),
  .btn:focus .btn-letter:nth-child(7) {
    animation-delay: 0.48s;
  }
  .btn-letter:nth-child(8),
  .btn:focus .btn-letter:nth-child(8) {
    animation-delay: 0.56s;
  }
  .btn-letter:nth-child(9),
  .btn:focus .btn-letter:nth-child(9) {
    animation-delay: 0.64s;
  }
  .btn-letter:nth-child(10),
  .btn:focus .btn-letter:nth-child(10) {
    animation-delay: 0.72s;
  }
  .btn-letter:nth-child(11),
  .btn:focus .btn-letter:nth-child(11) {
    animation-delay: 0.8s;
  }
  .btn-letter:nth-child(12),
  .btn:focus .btn-letter:nth-child(12) {
    animation-delay: 0.88s;
  }
  .btn-letter:nth-child(13),
  .btn:focus .btn-letter:nth-child(13) {
    animation-delay: 0.96s;
  }

  /* Active state */
  .btn:active {
    border: solid 1px hsla(var(--highlight-color-hue), 100%, 80%, 70%);
    background-color: hsla(var(--highlight-color-hue), 50%, 20%, 0.5);
  }
  .btn:active::before {
    box-shadow:
      0 -8px 12px -6px #fffa inset,
      0 -16px 16px -8px hsla(var(--highlight-color-hue), 100%, 70%, 80%) inset,
      1px 1px 1px #fff4,
      2px 2px 2px #fff2,
      -1px -1px 1px #0002,
      -2px -2px 2px #0001;
  }
  .btn:active::after {
    opacity: 1;
    mask-image: linear-gradient(0deg, #fff, transparent);
    filter: brightness(200%);
  }
  .btn:active .btn-letter {
    text-shadow: 0 0 1px hsla(var(--highlight-color-hue), 100%, 90%, 90%);
    animation: none;
  }

  /* Hover state */
  .btn:hover {
    border: solid 1px hsla(var(--highlight-color-hue), 100%, 80%, 40%);
  }

  .btn:hover::before {
    box-shadow:
      0 -8px 8px -6px #fffa inset,
      0 -16px 16px -8px hsla(var(--highlight-color-hue), 100%, 70%, 30%) inset,
      1px 1px 1px #fff2,
      2px 2px 2px #fff1,
      -1px -1px 1px #0002,
      -2px -2px 2px #0001;
  }

  .btn:hover::after {
    opacity: 1;
    mask-image: linear-gradient(0deg, #fff, transparent);
  }

  .btn:hover .btn-svg {
    fill: #fff;
    filter: drop-shadow(0 0 3px hsl(var(--highlight-color-hue), 100%, 70%))
      drop-shadow(0 -4px 6px #0009);
    animation: none;
  }`;

export default Button;
