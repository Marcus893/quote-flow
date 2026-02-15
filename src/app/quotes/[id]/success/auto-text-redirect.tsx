"use client";

import { useEffect, useRef } from "react";

interface AutoTextRedirectProps {
  smsLink: string;
}

export default function AutoTextRedirect({ smsLink }: AutoTextRedirectProps) {
  const triggered = useRef(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      const timer = setTimeout(() => {
        // Use a hidden anchor click — most reliable for sms: protocol
        linkRef.current?.click();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [smsLink]);

  return (
    <a
      ref={linkRef}
      href={smsLink}
      className="hidden"
      aria-hidden="true"
    />
  );
}
