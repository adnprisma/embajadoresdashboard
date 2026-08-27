import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function DineroPage() {
  return (
    <PageHeader title={copy.shell.nav.money} description={copy.common.placeholderPageDescription} />
  );
}
