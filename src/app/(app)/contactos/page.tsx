import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function ContactosPage() {
  return (
    <PageHeader title={copy.shell.nav.contacts} description={copy.common.placeholderPageDescription} />
  );
}
