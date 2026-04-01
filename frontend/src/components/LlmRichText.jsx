function normalizeText(value) {
  if (!value) return '';
  return String(value).replace(/\r\n/g, '\n').trim();
}

function parseBlocks(text) {
  const lines = normalizeText(text).split('\n');
  const blocks = [];
  let currentList = [];
  let currentParagraph = [];

  const flushList = () => {
    if (currentList.length) {
      blocks.push({ type: 'list', items: currentList });
      currentList = [];
    }
  };

  const flushParagraph = () => {
    if (currentParagraph.length) {
      blocks.push({ type: 'paragraph', text: currentParagraph.join(' ') });
      currentParagraph = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushParagraph();
      return;
    }

    const headingMatch = line.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      blocks.push({
        type: 'heading',
        title: headingMatch[1].trim(),
        text: headingMatch[2].trim(),
      });
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      currentList.push(line.replace(/^[-*]\s+/, '').trim());
      return;
    }

    flushList();
    currentParagraph.push(line.replace(/\*\*/g, ''));
  });

  flushList();
  flushParagraph();

  return blocks;
}

function toneClasses(tone) {
  switch (tone) {
    case 'chat-user':
      return {
        paragraph: 'text-white/95',
        heading: 'text-white',
        list: 'text-white/95',
        bullet: 'bg-white/80',
      };
    case 'chat-assistant':
      return {
        paragraph: 'text-text-dark',
        heading: 'text-moss',
        list: 'text-text-dark',
        bullet: 'bg-moss',
      };
    default:
      return {
        paragraph: 'text-text-mid',
        heading: 'text-moss',
        list: 'text-text-dark',
        bullet: 'bg-moss',
      };
  }
}

function LlmRichText({ text, tone = 'default', compact = false, className = '' }) {
  const blocks = parseBlocks(text);
  const palette = toneClasses(tone);
  const spacing = compact ? 'space-y-2' : 'space-y-4';
  const paragraphSize = compact ? 'text-sm leading-6' : 'text-sm leading-7';
  const headingSize = compact ? 'text-sm' : 'text-base';

  return (
    <div className={`${spacing} ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <div key={`${block.type}-${index}`} className="space-y-1">
              <p className={`${headingSize} font-semibold ${palette.heading}`}>{block.title}</p>
              {block.text ? <p className={`${paragraphSize} ${palette.paragraph}`}>{block.text}</p> : null}
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <div key={`${block.type}-${index}`} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <div key={`${block.type}-${index}-${itemIndex}`} className="flex items-start gap-3">
                  <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${palette.bullet}`} />
                  <p className={`${paragraphSize} ${palette.list}`}>{item}</p>
                </div>
              ))}
            </div>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className={`${paragraphSize} ${palette.paragraph}`}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export default LlmRichText;
