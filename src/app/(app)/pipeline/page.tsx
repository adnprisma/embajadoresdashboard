import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function PipelinePage() {
  return (
    <PageHeader title={copy.shell.nav.pipeline} description={copy.common.placeholderPageDescription} />
  );
}
