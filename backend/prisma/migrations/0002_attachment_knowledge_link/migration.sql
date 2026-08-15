-- Link knowledge sources to the attachment they were extracted from,
-- so uploaded files can be indexed and referenced in chat automatically.
ALTER TABLE "knowledge_sources" ADD COLUMN "attachment_id" TEXT;
CREATE UNIQUE INDEX "knowledge_sources_attachment_id_key" ON "knowledge_sources"("attachment_id");
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_attachment_id_fkey"
  FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
