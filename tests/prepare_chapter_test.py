"""Run with the project's bundled Python; all chapter fixtures are synthetic."""
import importlib.util, io, json, tempfile, zipfile
from pathlib import Path
from PIL import Image

spec=importlib.util.spec_from_file_location('prepare',Path(__file__).resolve().parents[1]/'server/recap/prepare.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

def image(size,color):
    stream=io.BytesIO();Image.new('RGB',size,color).save(stream,format='PNG');return stream.getvalue()

with tempfile.TemporaryDirectory(prefix='kael-chapter-') as tmp:
    root=Path(tmp);(root/'raw').mkdir()
    (root/'raw/source.zip').write_bytes(b'')
    with zipfile.ZipFile(root/'raw/source.zip','w') as z:
        z.writestr('010.png',image((200,200),'blue'));z.writestr('002.png',image((200,1200),'red'))
    (root/'sources.json').write_text(json.dumps({'files':[{'stored':'source.zip','name':'chapter.zip'}]}))
    data=module.prepare(root)
    assert data['panels'][0]['source']=='002.png' and data['panels'][-1]['source']=='010.png'
    assert len(data['panels'])>2 and data['audioDuration']==0
    first,second=data['panels'][:2];assert second['offsetY']==first['height']-120
    with zipfile.ZipFile(root/'raw/source.zip','w') as z:z.writestr('../escape.png',image((20,20),'red'))
    try:module.prepare(root);raise AssertionError('Unsafe ZIP accepted')
    except ValueError as error:assert 'aman' in str(error)
    assert not (root.parent/'escape.png').exists()
    pdf=root/'raw/chapter.pdf';Image.new('RGB',(300,450),'white').save(pdf,'PDF')
    (root/'sources.json').write_text(json.dumps({'files':[{'stored':'chapter.pdf','name':'chapter.pdf'}]}))
    assert module.prepare(root)['panels'][0]['source']=='chapter.pdf halaman 1'
print('Chapter image/ZIP/PDF, natural order, overlap and unsafe-path checks passed.')
