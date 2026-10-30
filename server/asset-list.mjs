// Explicit allowlist: new files in dist are NOT exposed automatically.
export const assetPaths=Object.freeze([
  '/index.html','/styles.css','/main.js','/sw.js','/manifest.webmanifest',
  '/icon.svg','/icon-192.png','/icon-512.png','/model/content.js',
  '/data/vocabulary.js','/data/market-content.js','/data/topics.js','/data/lexicon.js',
  '/data/sentences.js','/data/replies.js','/data/progress.js','/data/pt-vocabulary.js',
  '/data/pt-sentences.js','/data/reply-locales.js','/data/topic-locales.js','/data/meaning-rules.js',
  '/core/content-direction.js','/core/learning.js','/core/matching.js','/core/meaning-search.js',
  '/core/meaning-assessment.js','/core/meaning-policy.js','/data/language-forms.js','/core/reply-assessment.js','/core/session.js','/state/store.js',
  '/ui/view.js','/ui/components.js','/ui/context.js','/ui/messages.js','/ui/assessment.js',
  '/ui/word-review.js','/ui/meaning-review.js','/ui/practice.js','/ui/events.js',
  '/infrastructure/platform.js','/infrastructure/trusted-types.js',
  '/assets/fonts/dm-sans-latin.woff2','/assets/fonts/dm-sans-latin-ext.woff2',
  '/assets/fonts/libre-caslon-display-latin.woff2','/assets/fonts/libre-caslon-display-latin-ext.woff2'
]);
