import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function ClientesPage() {
  return (
    <PageHeader title={copy.shell.nav.clients} description={copy.common.placeholderPageDescription} />
  );
}
