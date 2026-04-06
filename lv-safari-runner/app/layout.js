import './globals.css';

export const metadata = {
  title: 'LV Safari Runner',
  description: 'A Louis Vuitton themed endless runner game',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
