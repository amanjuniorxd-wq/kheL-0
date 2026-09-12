-- Storage bucket for request supporting documents.
insert into storage.buckets (id, name, public)
values ('request-documents', 'request-documents', true)
on conflict (id) do nothing;

create policy "Users can upload their own request documents"
  on storage.objects for insert
  with check (
    bucket_id = 'request-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Request documents are publicly readable"
  on storage.objects for select
  using (bucket_id = 'request-documents');

create policy "Users can delete their own request documents"
  on storage.objects for delete
  using (
    bucket_id = 'request-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
