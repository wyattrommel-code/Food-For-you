import { type PropsWithChildren } from 'react';

/**
 * Web root document. Ensures html/body/#root fill the viewport so the app is
 * not letterboxed with empty margins (often seen as black side bars in portrait).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <style
          id="expo-root-fullbleed"
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                width: 100%;
                max-width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              *, *::before, *::after { box-sizing: inherit; }
              body { overflow: hidden; }
              #root {
                display: flex;
                flex: 1;
                flex-direction: column;
                min-height: 100%;
                min-width: 100%;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
