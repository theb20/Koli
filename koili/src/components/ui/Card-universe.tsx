import styled from "styled-components";

type CardItem = {
  text: string;
};

type CardProps = {
  title?: string;
  description?: string;
  items?: CardItem[];
  buttonText?: string;
  onClick?: () => void;
};

const DEFAULT_ITEMS: CardItem[] = [
  { text: "Set Clear Goals" },
  { text: "Stay Organized" },
  { text: "Continuous Learning" },
  { text: "Time Management" },
  { text: "Maintain a Positive Attitude" },
];

const CheckIcon = () => (
  <svg
    className="check_svg"
    fill="currentColor"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
      fillRule="evenodd"
    />
  </svg>
);

const Card = ({
  title = "Keys to Success",
  description = "Best way to be success in your life.",
  items = DEFAULT_ITEMS,
  buttonText = "Get Your Success",
  onClick,
}: CardProps) => {
  return (
    <StyledWrapper>
      <div className="card mt-4">
        <div className="card__border" />

        {/* TITLE */}
        <div className="card_title__container">
          <span className="card_title">{title}</span>
          <p className="card_paragraph">{description}</p>
        </div>

        <hr className="line" />

        {/* LIST */}
        <ul className="card__list">
          {items.map((item, index) => (
            <li className="card__list_item" key={index}>
              <span className="check">
                <CheckIcon />
              </span>
              <span className="list_text">{item.text}</span>
            </li>
          ))}
        </ul>

        {/* BUTTON */}
        <button className="button" onClick={onClick}>
          {buttonText}
        </button>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    --white: hsl(0, 0%, 100%);
    --black: hsla(240, 95%, 47%, 1.00);
    --paragraph: hsla(0, 0%, 100%, 1.00);
    --line: hsla(0, 0%, 100%, 0.35);
    --primary: hsla(0, 0%, 100%, 1.00);

    position: relative;

    display: flex;
    flex-direction: column;
    gap: 1rem;

    padding: 1rem;
    width: 19rem;
    background-color: hsla(226, 100%, 50%, 1.00);
    background-image: radial-gradient(
        at 88% 40%,
        hsla(240, 75%, 5%, 1.00) 0px,
        transparent 85%
      ),
      radial-gradient(at 49% 30%, hsla(240, 81%, 17%, 1.00) 0px, transparent 85%),
      radial-gradient(at 14% 26%, hsla(240, 15%, 9%, 1) 0px, transparent 85%),
      radial-gradient(at 0% 64%, hsla(225, 99%, 26%, 1.00) 0px, transparent 85%),
      radial-gradient(at 41% 94%, hsla(243, 97%, 36%, 1.00) 0px, transparent 85%),
      radial-gradient(at 100% 99%, hsla(241, 94%, 13%, 1.00) 0px, transparent 85%);

    border-radius: 1rem;
    box-shadow: 0px -16px 24px 0px rgba(2, 167, 255, 0.25) inset;
  }

  .card .card__border {
    overflow: hidden;
    pointer-events: none;

    position: absolute;
    z-index: -10;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    width: calc(100% + 2px);
    height: calc(100% + 2px);
    background-image: linear-gradient(
      0deg,
      hsla(0, 71%, 3%, 1.00) -50%,
      hsla(0, 0%, 0%, 1.00) 100%
    );

    border-radius: 1rem;
  }

  .card .card__border::before {
    content: "";
    pointer-events: none;

    position: fixed;
    z-index: 200;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%), rotate(0deg);
    transform-origin: left;

    width: 200%;
    height: 10rem;
    background-image: linear-gradient(
      0deg,
      hsla(0, 0%, 100%, 0) 0%,
      hsla(240, 100%, 50%, 1.00) 40%,
      hsla(175, 100%, 50%, 1.00) 60%,
      hsla(242, 88%, 50%, 0.17) 100%
    );

    animation: rotate 8s linear infinite;
  }

  @keyframes rotate {
    to {
      transform: rotate(360deg);
    }
  }

  .card .card_title__container .card_title {
    font-size: 1rem;
    color: var(--white);
  }

  .card .card_title__container .card_paragraph {
    margin-top: 0.25rem;
    width: 65%;

    font-size: 0.5rem;
    color: var(--paragraph);
  }

  .card .line {
    width: 100%;
    height: 0.1rem;
    background-color: var(--line);

    border: none;
  }

  .card .card__list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .card .card__list .card__list_item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .card .card__list .card__list_item .check {
    display: flex;
    justify-content: center;
    align-items: center;

    width: 1rem;
    height: 1rem;
    background-color: var(--primary);

    border-radius: 50%;
  }

  .card .card__list .card__list_item .check .check_svg {
    width: 0.75rem;
    height: 0.75rem;

    fill: var(--black);
  }

  .card .card__list .card__list_item .list_text {
    font-size: 0.75rem;
    color: var(--white);
  }

  .card .button {
    cursor: pointer;

    padding: 0.5rem;
    width: 100%;
    background-image: linear-gradient(
      0deg,
      hsla(236, 100%, 50%, 1.00),
      hsla(231, 100%, 50%, 0.50) 100%
    );

    font-size: 0.75rem;
    color: var(--white);

    border: 0;
    border-radius: 9999px;
    box-shadow: inset 0 -2px 25px -4px var(--white);
  }`;

export default Card;