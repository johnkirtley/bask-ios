import './globals.css';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import TabBar from '../components/navigation/TabBar';
import IonicProvider from '../components/IonicProvider';
import ErrorBoundary from '../components/ErrorBoundary';

const dmSans = DM_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bask',
  description: 'Track your vitamin D and sun exposure with intelligent UV monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="mytheme" className="hydrated">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
      </head>
      <body className={`${dmSans.className} bg-light-bg text-text-primary`}>
        <ErrorBoundary>
          <IonicProvider>
            <main className="scroll-container">{children}</main>
            <TabBar />
          </IonicProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
