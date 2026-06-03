import type { MetadataRoute } from 'next';

import experienciasData from '@/content/experiencias.json';
import siteData from '@/content/site.json';
import { cabanas } from '@/lib/cabanas';

const BASE = siteData.canonicalUrl.replace(/\/$/, '');
const NOW = new Date();

interface PageOpts {
  changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority?: number;
}

function entry(path: string, opts: PageOpts = {}): MetadataRoute.Sitemap[number] {
  const esUrl = `${BASE}/es${path}`;
  const enUrl = `${BASE}/en${path}`;
  return {
    url: esUrl,
    lastModified: NOW,
    changeFrequency: opts.changeFrequency ?? 'monthly',
    priority: opts.priority ?? 0.7,
    alternates: {
      languages: {
        es: esUrl,
        en: enUrl,
        'x-default': esUrl,
      },
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const experiencias = experienciasData as { slug: string }[];

  return [
    entry('', { priority: 1.0, changeFrequency: 'weekly' }),
    entry('/cabanas', { priority: 0.9, changeFrequency: 'monthly' }),
    ...cabanas.map((c) =>
      entry(`/cabanas/${c.slug}`, { priority: 0.85, changeFrequency: 'monthly' }),
    ),
    entry('/experiencia', { priority: 0.8, changeFrequency: 'monthly' }),
    ...experiencias.map((e) =>
      entry(`/experiencia/${e.slug}`, { priority: 0.75, changeFrequency: 'monthly' }),
    ),
    entry('/ubicacion', { priority: 0.7, changeFrequency: 'yearly' }),
  ];
}
