"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { BillingDataTab } from "@/components/perfil/BillingDataTab";
import { DocumentsTab } from "@/components/perfil/DocumentsTab";
import { OwnPricesTab } from "@/components/perfil/OwnPricesTab";
import { PersonalDataTab } from "@/components/perfil/PersonalDataTab";
import { copy } from "@/config/copy";

const TAB_TRIGGER_CLASSES =
  "rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-primary data-[state=active]:bg-bg-sunken data-[state=active]:text-text-primary";

export function PerfilView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.shell.userMenu.profile} />

      <Tabs.Root defaultValue="personal">
        <Tabs.List className="flex items-center gap-1 border-b border-border-subtle">
          <Tabs.Trigger value="personal" className={TAB_TRIGGER_CLASSES}>
            {copy.perfil.tabs.personal}
          </Tabs.Trigger>
          <Tabs.Trigger value="billing" className={TAB_TRIGGER_CLASSES}>
            {copy.perfil.tabs.billing}
          </Tabs.Trigger>
          <Tabs.Trigger value="prices" className={TAB_TRIGGER_CLASSES}>
            {copy.perfil.tabs.prices}
          </Tabs.Trigger>
          <Tabs.Trigger value="documents" className={TAB_TRIGGER_CLASSES}>
            {copy.perfil.tabs.documents}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="personal" className="pt-5">
          <PersonalDataTab />
        </Tabs.Content>
        <Tabs.Content value="billing" className="pt-5">
          <BillingDataTab />
        </Tabs.Content>
        <Tabs.Content value="prices" className="pt-5">
          <OwnPricesTab />
        </Tabs.Content>
        <Tabs.Content value="documents" className="pt-5">
          <DocumentsTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
