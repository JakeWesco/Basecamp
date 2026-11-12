import { WhatsappLogo } from "./icons";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./styles";

/** The wa.me link that opens WhatsApp with the message and link ready to send. */
export function whatsAppHref({ message, url }: { message: string; url: string }) {
  const text = [message.trim(), url].filter(Boolean).join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Opens WhatsApp (the app on phones, WhatsApp Web on desktop) with a message
 * and link filled in. The user picks who to send it to.
 */
export function ShareToWhatsApp({
  message,
  url,
  label = "Share to WhatsApp",
  variant = "secondary",
  size = "md",
}: {
  message: string;
  url: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <a href={whatsAppHref({ message, url })} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant, size })}>
      <WhatsappLogo className="size-5" />
      {label}
      <span className="sr-only"> (opens WhatsApp)</span>
    </a>
  );
}
