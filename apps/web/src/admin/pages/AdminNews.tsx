import NewsPipelinePage from './news/NewsPipelinePage';
import AdminNewsLegacySetup from './AdminNewsLegacySetup';

/** 3-step news pipeline + legacy Telegram QR / channel CRUD */
export default function AdminNews() {
  return (
    <>
      <NewsPipelinePage />
      <AdminNewsLegacySetup />
    </>
  );
}
