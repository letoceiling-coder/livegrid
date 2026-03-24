import json

with open('/tmp/complex2.json') as f:
    d = json.load(f)

c = d.get('data', d)
print('name:', c.get('name'))
print('price_from:', c.get('price_from'))
print('images count:', len(c.get('images', [])))
if c.get('images'):
    print('first image:', c['images'][0])
buildings = c.get('buildings', [])
print('buildings:', len(buildings))
if buildings:
    apts = buildings[0].get('apartments', [])
    print('apts in building[0]:', len(apts))
    if apts:
        a = apts[0]
        print('first apt keys:', list(a.keys()))
        print('first apt rooms:', a.get('rooms'))
        print('first apt roomName:', a.get('roomName'))
        print('first apt price:', a.get('price'))
