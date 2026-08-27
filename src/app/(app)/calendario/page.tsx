import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function CalendarioPage() {
  return (
    <PageHeader title={copy.shell.nav.calendar} description={copy.common.placeholderPageDescription} />
  );
}
