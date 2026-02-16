"use client";

import { useEffect } from "react";
import { identifyUser } from "@/lib/analytics";

interface Props {
  userId: string;
  email?: string;
  businessName?: string;
  tier?: string;
}

export default function IdentifyUser({ userId, email, businessName, tier }: Props) {
  useEffect(() => {
    identifyUser(userId, {
      email,
      business_name: businessName,
      subscription_tier: tier,
    });
  }, [userId, email, businessName, tier]);

  return null;
}
