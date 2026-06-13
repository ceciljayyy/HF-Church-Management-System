import { ModulePage } from '@/features/modules/module-page';

const media = [
  ['Sunday Service Photo', 'Images / Events', 'Published'],
  ['Youth Flyer', 'Images / Flyers', 'Draft'],
  ['Monthly Report', 'Documents / Reports', 'Published'],
];

export default function MediaPage() {
  return (
    <ModulePage
      title="Media Library"
      description="Manage church images, documents, folders, and public media assets."
      columns={['File', 'Folder', 'Status']}
      rows={media}
      actionLabel="Upload File"
      filters={['Type', 'Folder', 'Sort']}
    />
  );
}
