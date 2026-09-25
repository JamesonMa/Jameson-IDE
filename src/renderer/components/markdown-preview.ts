import { marked } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';
import { t } from '../i18n';

function renderMath(value: string, display: boolean): string {
  try {
    return katex.renderToString(value.trim(), {
      displayMode: display,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    const escaped = value.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c] || c));
    return display ? `<div class="math-error">${escaped}</div>` : `<span class="math-error">${escaped}</span>`;
  }
}

let markedMathConfigured = false;

function configureMarkedMath() {
  if (markedMathConfigured) return;
  markedMathConfigured = true;
  marked.use({
    extensions: [
      {
        name: 'mathBlock',
        level: 'block',
        start: (source: string) => source.indexOf('$$'),
        tokenizer(source: string) {
          const match = /^\$\$(?!\$)[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?\$\$(?:\r?\n|$)/.exec(source);
          if (!match) return;
          return { type: 'mathBlock', raw: match[0], text: match[1] } as any;
        },
        renderer(token: any) { return renderMath(token.text, true); },
      },
      {
        name: 'mathInline',
        level: 'inline',
        start: (source: string) => source.indexOf('$'),
        tokenizer(source: string) {
          const match = /^\$(?!\$)([^$\n]+?)\$(?!\$)/.exec(source);
          if (!match || match[1].trim().length === 0) return;
          return { type: 'mathInline', raw: match[0], text: match[1] } as any;
        },
        renderer(token: any) { return renderMath(token.text, false); },
      },
    ],
  });
}

export class MarkdownPreview {
  private container: HTMLElement;
  private filePath = '';
  private content = '';
  private renderVersion = 0;
  private resizing = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'markdown-preview';
    this.container.id = 'markdown-preview';
    this.container.style.display = 'none';
    configureMarkedMath();
    marked.setOptions({ gfm: true, breaks: true });
  }

  getContainer(): HTMLElement { return this.container; }

  show(filePath: string, content: string) {
    this.filePath = filePath;
    this.content = content;
    this.render();
    this.container.style.display = 'flex';
  }

  hide() { this.container.style.display = 'none'; }

  update(content: string) { this.content = content; this.render(); }

  isVisible(): boolean { return this.container.style.display !== 'none'; }

  getCurrentFile(): string { return this.filePath; }

  private wireResizeHandle() {
    const handle = this.container.querySelector('.markdown-preview-resize-handle');
    handle?.addEventListener('mousedown', (event) => {
      event.preventDefault();
      this.resizing = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', this.resizeMove);
      document.addEventListener('mouseup', this.stopResize, { once: true });
    });
  }

  private resizeMove = (event: MouseEvent) => {
    if (!this.resizing) return;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1;
    const percent = Math.max(20, Math.min(80, ((viewportWidth - event.clientX) / viewportWidth) * 100));
    this.container.style.width = `${percent}%`;
  };

  private stopResize = () => {
    this.resizing = false;
    document.removeEventListener('mousemove', this.resizeMove);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  private async render() {
    const version = ++this.renderVersion;
    try {
      const html = await marked.parse(this.content);
      if (version !== this.renderVersion) return;
      const safeHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del',
          'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead',
          'tbody', 'tr', 'th', 'td', 'details', 'summary', 'span', 'div',
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'open', 'style',
        ],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
      });
      if (version !== this.renderVersion) return;
      const title = (this.filePath.split(/[\\/]/).pop() || 'document').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
      this.container.innerHTML = `
        <div class="markdown-preview-resize-handle" role="separator" aria-orientation="vertical" aria-label="${t('resizeMarkdownPreview')}" tabindex="0"></div>
        <div class="markdown-header">
          <span class="markdown-title">${t('previewTitle', { title })}</span>
          <button class="markdown-close" id="md-preview-close">&times;</button>
        </div>
        <div class="markdown-body">${safeHtml}</div>
      `;
      this.wireResizeHandle();
      this.container.querySelector('#md-preview-close')?.addEventListener('click', () => this.hide());
    } catch {
      if (version !== this.renderVersion) return;
      this.container.innerHTML = `
        <div class="markdown-preview-resize-handle" role="separator" aria-orientation="vertical" aria-label="${t('resizeMarkdownPreview')}" tabindex="0"></div>
        <div class="markdown-header"><span class="markdown-title">${t('previewError')}</span><button class="markdown-close" id="md-preview-close">&times;</button></div>
        <div class="markdown-body"><p style="color: var(--danger);">${t('markdownRenderFailed')}</p></div>
      `;
      this.wireResizeHandle();
      this.container.querySelector('#md-preview-close')?.addEventListener('click', () => this.hide());
    }
  }
}
