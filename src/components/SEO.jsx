import { useEffect } from 'react';

/**
 * Komponent SEO do zarządzania meta tagami i structured data
 */
const SEO = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url,
  type = 'website',
  structuredData
}) => {
  useEffect(() => {
    // Aktualizacja title
    if (title) {
      document.title = `${title} | Wyjście z Długów`;
    }

    // Funkcja do aktualizowania lub tworzenia meta tagu
    const updateMetaTag = (name, content, attribute = 'name') => {
      if (!content) return;
      
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Podstawowe meta tagi
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Open Graph
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', image || '/logo.png', 'property');
    updateMetaTag('og:url', url || (typeof window !== 'undefined' ? window.location.href : ''), 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:site_name', 'Wyjście z Długów', 'property');
    updateMetaTag('og:locale', 'pl_PL', 'property');
    
    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', title, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image || '/logo.png', 'name');
    
    // Dodatkowe meta tagi
    updateMetaTag('author', 'Kancelaria Wyjście z Długów');
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('language', 'pl');
    updateMetaTag('geo.region', 'PL');

    // Structured Data (JSON-LD)
    if (structuredData) {
      // Usuń poprzednie structured data
      const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
      existingScripts.forEach(script => script.remove());
      
      // Dodaj nowe structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup - nie usuwamy meta tagów, bo mogą być używane przez inne komponenty
  }, [title, description, keywords, image, url, type, structuredData]);

  return null;
};

export default SEO;
