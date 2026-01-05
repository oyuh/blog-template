# Blog Interactive Components

This folder contains interactive React components that can be used in blog posts (both `.md` and `.mdx` files).

## Available Components

### 1. GitHubRepoCard

Displays a GitHub repository with live stats fetched from the GitHub API.

**Usage:**

```mdx
import GitHubRepoCard from '@/components/blog/GitHubRepoCard.tsx';

<GitHubRepoCard repo="owner/repository" />

<!-- Compact version -->
<GitHubRepoCard repo="owner/repository" compact />
```

**Props:**
- `repo` (required): GitHub repository in format `owner/repository`
- `compact` (optional): Show compact inline version

**Features:**
- Shows repository name, description, stars, forks, issues
- Displays programming language and topics
- Auto-fetches data from GitHub API
- Responsive design
- Hover animations

---

### 2. LinkPreview

Shows a preview card for any URL, with metadata fetched on hover or always visible.

**Usage:**

```mdx
import LinkPreview from '@/components/blog/LinkPreview.tsx';

<!-- Hover preview (tooltip) -->
<LinkPreview url="https://example.com">Link Text</LinkPreview>

<!-- Always show card -->
<LinkPreview url="https://example.com" showPreview />
```

**Props:**
- `url` (required): The URL to preview
- `children` (optional): Custom link text (if not provided, uses URL)
- `showPreview` (optional): If true, always show card; if false, show on hover

**Features:**
- Fetches Open Graph metadata
- Shows site title, description, image, and favicon
- Hover tooltip or permanent card display
- Smooth animations

---

### 3. Chart

Create interactive charts and graphs using HTML5 Canvas.

**Usage:**

```mdx
import Chart from '@/components/blog/Chart.tsx';

<Chart
  data={[
    { x: 'Jan', y: 30 },
    { x: 'Feb', y: 45 },
    { x: 'Mar', y: 38 }
  ]}
  type="line"
  title="Monthly Data"
  xLabel="Month"
  yLabel="Value"
  height={300}
/>
```

**Props:**
- `data` (required): Array of data points `{ x: string | number, y: number, label?: string }`
- `type` (optional): `'line'` | `'bar'` | `'scatter'` (default: `'line'`)
- `title` (optional): Chart title
- `xLabel` (optional): X-axis label
- `yLabel` (optional): Y-axis label
- `color` (optional): Custom color (default: accent color)
- `width` (optional): Chart width in pixels (default: 600)
- `height` (optional): Chart height in pixels (default: 400)

**Chart Types:**
- **Line Chart**: Shows trends over time
- **Bar Chart**: Compares different values
- **Scatter Plot**: Shows distribution of data points

**Features:**
- Canvas-based rendering
- Responsive design
- Theme-aware (adapts to light/dark mode)
- Grid lines and axis labels
- Smooth animations

---

### 4. InfoCard

Display highlighted information with styled cards.

**Usage:**

```mdx
import InfoCard from '@/components/blog/InfoCard.tsx';

<InfoCard title="Important Note" type="info">
This is important information to highlight.
</InfoCard>

<InfoCard title="Success!" type="success">
Operation completed successfully!
</InfoCard>

<InfoCard title="Warning" type="warning">
Proceed with caution.
</InfoCard>

<InfoCard title="Error" type="error">
Something went wrong.
</InfoCard>

<!-- Custom icon -->
<InfoCard title="Tip" type="info" icon="💡">
Here's a helpful tip!
</InfoCard>
```

**Props:**
- `title` (required): Card title
- `children` (required): Card content
- `type` (optional): `'info'` | `'success'` | `'warning'` | `'error'` (default: `'info'`)
- `icon` (optional): Custom emoji or icon (overrides default)

**Features:**
- Four pre-styled types with color coding
- Default icons for each type
- Custom icon support
- Hover animation
- Fully responsive

---

### 5. EnhancedProse (Auto-applied)

This component is automatically applied to all blog posts. It enhances regular markdown links.

**Features:**
- Auto-detects GitHub repository links
- Adds GitHub icon to repo links
- Improves link accessibility

**Automatic Enhancement:**
All GitHub repository links in your markdown are automatically enhanced:

```md
Check out [Astro](https://github.com/withastro/astro)
```

The link will automatically get a GitHub icon indicator.

---

## Example Posts

See the following example posts in `/src/content/post/testing/`:

- `interactive-components.mdx` - Full showcase of all components
- `github-charts-demo.mdx` - Quick example with GitHub cards and charts

## How to Use in Posts

1. **For MDX files** (`.mdx`): Import components at the top of your file

```mdx
---
title: "My Post"
---

import GitHubRepoCard from '@/components/blog/GitHubRepoCard.tsx';
import Chart from '@/components/blog/Chart.tsx';

Your content here...

<GitHubRepoCard repo="facebook/react" />
```

2. **For Markdown files** (`.md`): GitHub link enhancement works automatically! For other components, convert to `.mdx`

## API Endpoint

The LinkPreview component uses `/api/link-preview` to fetch metadata. This endpoint:
- Fetches target URL HTML
- Extracts Open Graph and meta tags
- Returns structured metadata
- Caches responses for 1 hour

## Styling

All components use your site's theme colors and adapt to light/dark mode automatically. Styles are defined in:
- `/src/styles/global.css` - Component-specific styles
- Inline styles in components - Theme-aware colors

## Performance

- GitHub API calls are made client-side (no build-time overhead)
- Link previews are fetched on-demand (hover or visible)
- Charts render with Canvas (hardware-accelerated)
- All components are code-split and lazy-loaded
