"use client";

import AccountingProfits from "../accounting/accounting-profits";
import type { Profile } from "../lazy-dashboard/types";

export default function AdminSettlements({ profile }: { profile: Profile }) {
  return <AccountingProfits profile={profile} />;
}
