import SafariRunner from '@/components/SafariRunner';

export default function Home() {
  return (
    <main
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1008',
      }}
    >
      <SafariRunner />
    </main>
  );
}
