import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function PerfilPage() {
  return (
    <PageHeader
      title={copy.shell.userMenu.profile}
      description={copy.common.placeholderPageDescription}
    />
  );
}
