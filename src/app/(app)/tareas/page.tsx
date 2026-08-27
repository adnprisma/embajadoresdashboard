import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function TareasPage() {
  return (
    <PageHeader title={copy.shell.nav.tasks} description={copy.common.placeholderPageDescription} />
  );
}
