import re

with open('backend/prisma/schema.prisma', 'r') as f:
    content = f.read()

models = re.split(r'^(?=model )', content, flags=re.MULTILINE)
out = []

for m in models:
    if not m.startswith('model '):
        out.append(m)
        continue
    
    # Extract model name
    model_name = re.match(r'model (\w+)', m).group(1)
    
    # Find all fields that are used as foreign keys in @relation(fields: [xyz])
    relation_fields = re.findall(r'@relation\([^)]*fields:\s*\[([\w\s,]+)\]', m)
    
    # Find already defined indexes
    existing_indexes = re.findall(r'@@index\(\[([\w\s,]+)\]\)', m)
    
    # Extract unique constraints which are implicitly indexed
    unique_fields = re.findall(r'(\w+)\s+[\w\?]+\s+.*@unique', m)
    
    to_index = set()
    for rf in relation_fields:
        # fields can be comma separated
        fields = [f.strip() for f in rf.split(',')]
        if len(fields) == 1:
            to_index.add(fields[0])
            
    # Add other common filter fields
    common = ['status', 'createdAt', 'isActive']
    for c in common:
        if re.search(r'\b' + c + r'\b\s+\w+', m):
            to_index.add(c)
            
    # Also index firstName and lastName in Patient/Staff
    if model_name in ('Patient', 'Staff'):
        to_index.add('firstName')
        to_index.add('lastName')

    # Remove fields that already have a unique constraint
    to_index = [idx for idx in to_index if idx not in unique_fields]
    
    # Remove fields that are already indexed
    final_indexes = []
    for idx in to_index:
        already_indexed = False
        for ex in existing_indexes:
            if idx in [x.strip() for x in ex.split(',')]:
                already_indexed = True
        if not already_indexed:
            final_indexes.append(idx)
            
    if final_indexes:
        # Insert indexes before the closing brace
        lines = m.split('\n')
        for i in range(len(lines)-1, -1, -1):
            if lines[i].strip() == '}':
                insert_idx = i
                break
        
        index_statements = []
        for idx in final_indexes:
            index_statements.append(f'  @@index([{idx}])')
            
        lines.insert(insert_idx, '\n'.join(index_statements))
        m = '\n'.join(lines)
        
    out.append(m)

with open('backend/prisma/schema.prisma', 'w') as f:
    f.write(''.join(out))
    
print("Indexes added successfully.")
