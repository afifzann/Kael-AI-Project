export function captionPages(text) {
  const lines=[];let line='';
  for(const token of text.trim().split(/\s+/))for(const word of token.match(/.{1,30}/gu)||[]) {
    if(line&&(line+' '+word).length>30){lines.push(line);line=word;}else line=line?line+' '+word:word;
  }
  if(line)lines.push(line);
  const pages=[];for(let i=0;i<lines.length;i+=2)pages.push(lines.slice(i,i+2));return pages;
}
