import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function RecursosPage() {
  return (
    <PageHeader
      title={copy.shell.nav.resources}
      description={copy.common.placeholderPageDescription}
    />
  );
}
