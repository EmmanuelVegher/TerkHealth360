import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// ── 1. GET /api/terminology/stats (Dictionary Summary) ───────────────────────
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const [totalConcepts, totalMappings, systemCounts, categoryCounts] = await Promise.all([
      prisma.terminologyConcept.count(),
      prisma.codeMapping.count(),
      prisma.terminologyConcept.groupBy({
        by: ['system'],
        _count: { _all: true },
      }),
      prisma.terminologyConcept.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
    ]);

    res.json({
      totalConcepts,
      totalMappings,
      globalLoincRegistryTotal: 109325,
      globalLoincBreakdown: {
        laboratory: 66861,
        clinical: 28635,
        surveys: 12668,
        claimsAttachments: 1161,
      },
      bySystem: systemCounts.reduce((acc: any, curr) => {
        acc[curr.system] = curr._count._all;
        return acc;
      }, {}),
      byCategory: categoryCounts.reduce((acc: any, curr) => {
        acc[curr.category || 'OTHER'] = curr._count._all;
        return acc;
      }, {}),
    });
  } catch (error) {
    next(error);
  }
});

// ── 1b. GET /api/terminology/remote-search (Query LOINC & Global Terms with Offline Timeout) ──────
router.get('/remote-search', authMiddleware, async (req, res, next) => {
  try {
    const { query, system = 'LOINC' } = req.query;
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({ total: 0, results: [] });
    }

    const q = query.trim();
    const sys = system.toString().toUpperCase();

    // Helper for fast-failing fetch when offline
    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        return null;
      }
    };

    if (sys === 'LOINC') {
      const url = `https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search?terms=${encodeURIComponent(q)}&maxList=100`;
      const data: any = await fetchWithTimeout(url);
      if (!data) return res.json({ total: 0, results: [], offline: true });

      const totalCount = data[0] || 0;
      const codes: string[] = data[1] || [];
      const displays: any[] = data[3] || [];

      const results = codes.map((code: string, idx: number) => ({
        system: 'LOINC',
        systemUri: 'http://loinc.org',
        code,
        display: displays[idx]?.[0] || `LOINC ${code}`,
        category: 'LAB',
        description: `Official LOINC Code ${code} (LOINC v2.82 Global Registry)`,
      }));

      return res.json({ total: totalCount, registryTotal: 109325, results });
    } else if (sys === 'ICD10') {
      const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${encodeURIComponent(q)}&sf=code,name&maxList=100`;
      const data: any = await fetchWithTimeout(url);
      if (!data) return res.json({ total: 0, results: [], offline: true });

      const totalCount = data[0] || 0;
      const details: any[] = data[3] || [];

      const results = details.map((item: any) => ({
        system: 'ICD10',
        systemUri: 'http://hl7.org/fhir/sid/icd-10',
        code: item[0],
        display: item[1] || item[0],
        category: 'DIAGNOSIS',
        description: `Official ICD-10-CM Clinical Diagnosis ${item[0]} (71,704 Global Registry)`,
      }));

      return res.json({ total: totalCount, registryTotal: 71704, results });
    } else if (sys === 'RXNORM') {
      const url = `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(q)}&maxList=100`;
      const data: any = await fetchWithTimeout(url);
      if (!data) return res.json({ total: 0, results: [], offline: true });

      const totalCount = data[0] || 0;
      const names: string[] = data[1] || [];

      const results = names.map((name: string, idx: number) => ({
        system: 'RXNORM',
        systemUri: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: `RX-${200000 + idx}`,
        display: name,
        category: 'PHARMACY',
        description: `RxNorm Clinical Drug Formulation ${name} (118,500 Global Registry)`,
      }));

      return res.json({ total: totalCount, registryTotal: 118500, results });
    } else {
      const url = `https://clinicaltables.nlm.nih.gov/api/conditions/v3/search?terms=${encodeURIComponent(q)}&maxList=100`;
      const data: any = await fetchWithTimeout(url);
      if (!data) return res.json({ total: 0, results: [], offline: true });

      const totalCount = data[0] || 0;
      const names: any[] = data[3] || [];

      const results = names.map((item: any, idx: number) => ({
        system: sys,
        systemUri: 'http://snomed.info/sct',
        code: `${sys}-${1000 + idx}`,
        display: item[0] || item,
        category: 'DIAGNOSIS',
        description: `${sys} Global Standard Registry Item ${item[0] || item}`,
      }));

      return res.json({ total: totalCount, registryTotal: 10000, results });
    }
  } catch (error) {
    res.json({ total: 0, results: [], offline: true });
  }
});

// ── 2. GET /api/terminology/concepts (Search & Filter Dictionary) ───────────
router.get('/concepts', authMiddleware, async (req, res, next) => {
  try {
    const { search, system, category, limit = '50', offset = '0' } = req.query;

    const where: any = { isActive: true };

    if (system && system !== 'ALL') {
      where.system = (system as string).toUpperCase();
    }

    if (category && category !== 'ALL') {
      where.category = (category as string).toUpperCase();
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { display: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(parseInt(limit as string) || 100, 1000);
    const skip = parseInt(offset as string) || 0;

    const [concepts, total] = await Promise.all([
      prisma.terminologyConcept.findMany({
        where,
        include: {
          mappings: true,
        },
        orderBy: [{ system: 'asc' }, { code: 'asc' }],
        take,
        skip,
      }),
      prisma.terminologyConcept.count({ where }),
    ]);

    res.json({
      data: concepts,
      total,
      limit: take,
      offset: skip,
    });
  } catch (error) {
    next(error);
  }
});

// ── 3. POST /api/terminology/concepts (Add Concept) ─────────────────────────
router.post('/concepts', authMiddleware, async (req: any, res, next) => {
  try {
    const schema = z.object({
      system: z.string().min(1),
      code: z.string().min(1),
      display: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      systemUri: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const concept = await prisma.terminologyConcept.upsert({
      where: {
        system_code: {
          system: data.system.toUpperCase(),
          code: data.code,
        },
      },
      update: {
        display: data.display,
        description: data.description,
        category: data.category?.toUpperCase(),
        systemUri: data.systemUri,
        isActive: true,
      },
      create: {
        system: data.system.toUpperCase(),
        code: data.code,
        display: data.display,
        description: data.description,
        category: data.category?.toUpperCase(),
        systemUri: data.systemUri || getSystemUri(data.system),
        isActive: true,
      },
    });

    res.json(concept);
  } catch (error) {
    next(error);
  }
});

// ── 4. POST /api/terminology/map (Map Local Item to Standard) ────────────────
router.post('/map', authMiddleware, async (req: any, res, next) => {
  try {
    const schema = z.object({
      localItemType: z.string().min(1),
      localItemId: z.string().min(1),
      conceptId: z.string().min(1),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const mapping = await prisma.codeMapping.create({
      data: {
        localItemType: data.localItemType,
        localItemId: data.localItemId,
        conceptId: data.conceptId,
        notes: data.notes,
      },
      include: {
        concept: true,
      },
    });

    res.json(mapping);
  } catch (error) {
    next(error);
  }
});

// ── 5. GET /api/terminology/export-fhir (Export FHIR Multi-Format Bundle) ──
router.get('/export-fhir', authMiddleware, async (req, res, next) => {
  try {
    const format = (req.query.format as string || 'json').toLowerCase();

    const concepts = await prisma.terminologyConcept.findMany({
      where: { isActive: true },
      orderBy: [{ system: 'asc' }, { code: 'asc' }],
    });

    const fhirBundle = {
      resourceType: 'Bundle',
      id: `bundle-terminology-${Date.now()}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      total: concepts.length,
      entry: concepts.map(c => ({
        fullUrl: `${c.systemUri || getSystemUri(c.system)}/${c.code}`,
        resource: {
          resourceType: 'CodeSystem',
          id: `${c.system.toLowerCase()}-${c.code.replace(/[^a-zA-Z0-9]/g, '-')}`,
          url: c.systemUri || getSystemUri(c.system),
          version: '5.0.0',
          name: `${c.system}_${c.code.replace(/[^a-zA-Z0-9]/g, '_')}`,
          title: `${c.system} Standard Code ${c.code}`,
          status: 'active',
          experimental: false,
          publisher: 'Faith Foundation Mission Hospital HL7 Interoperability Hub',
          description: c.description || c.display,
          concept: [
            {
              code: c.code,
              display: c.display,
              definition: c.description || c.display,
            },
          ],
        },
      })),
    };

    if (format === 'xml') {
      const xmlString = convertFhirBundleToXml(fhirBundle);
      res.setHeader('Content-Type', 'application/fhir+xml');
      res.setHeader('Content-Disposition', `attachment; filename=HL7_FHIR_DataDictionary_${Date.now()}.xml`);
      return res.send(xmlString);
    } else if (format === 'ndjson') {
      const ndjsonString = fhirBundle.entry.map(e => JSON.stringify(e.resource)).join('\n');
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', `attachment; filename=HL7_FHIR_DataDictionary_${Date.now()}.ndjson`);
      return res.send(ndjsonString);
    } else {
      res.setHeader('Content-Type', 'application/fhir+json');
      res.setHeader('Content-Disposition', `attachment; filename=HL7_FHIR_DataDictionary_${Date.now()}.json`);
      return res.json(fhirBundle);
    }
  } catch (error) {
    next(error);
  }
});

// ── 6. GET /api/terminology/concept-fhir/:id (Single Concept FHIR Inspector) ──
router.get('/concept-fhir/:id', authMiddleware, async (req, res, next) => {
  try {
    const concept = await prisma.terminologyConcept.findUnique({
      where: { id: req.params.id },
      include: { mappings: true },
    });

    if (!concept) {
      return res.status(404).json({ message: 'Concept not found' });
    }

    const fhirResource = {
      resourceType: 'CodeSystem',
      id: `${concept.system.toLowerCase()}-${concept.code.replace(/[^a-zA-Z0-9]/g, '-')}`,
      url: concept.systemUri || getSystemUri(concept.system),
      version: '5.0.0',
      name: `${concept.system}_${concept.code.replace(/[^a-zA-Z0-9]/g, '_')}`,
      title: `${concept.system} Standard Code ${concept.code}`,
      status: 'active',
      experimental: false,
      publisher: 'Faith Foundation Mission Hospital HL7 Interoperability Hub',
      description: concept.description || concept.display,
      valueSet: `http://hl7.org/fhir/ValueSet/${concept.system.toLowerCase()}-all`,
      hierarchyMeaning: 'is-a',
      compositional: false,
      versionNeeded: false,
      content: 'complete',
      concept: [
        {
          code: concept.code,
          display: concept.display,
          definition: concept.description || concept.display,
          designation: concept.mappings.map(m => ({
            use: { system: 'http://snomed.info/sct', code: '900000000000013009', display: 'Synonym' },
            value: `Local Item ${m.localItemType}:${m.localItemId}`,
          })),
        },
      ],
    };

    const xmlResource = `<?xml version="1.0" encoding="UTF-8"?>
<CodeSystem xmlns="http://hl7.org/fhir">
  <id value="${escapeXml(fhirResource.id)}"/>
  <url value="${escapeXml(fhirResource.url)}"/>
  <version value="5.0.0"/>
  <name value="${escapeXml(fhirResource.name)}"/>
  <title value="${escapeXml(fhirResource.title)}"/>
  <status value="active"/>
  <publisher value="${escapeXml(fhirResource.publisher)}"/>
  <description value="${escapeXml(fhirResource.description)}"/>
  <concept>
    <code value="${escapeXml(concept.code)}"/>
    <display value="${escapeXml(concept.display)}"/>
    <definition value="${escapeXml(concept.description || concept.display)}"/>
  </concept>
</CodeSystem>`;

    const umlDefinition = {
      name: concept.display,
      class: 'CodeSystem.concept',
      cardinality: '[0..*]',
      stereotype: 'CodeableConcept',
      attributes: [
        { name: 'code', type: 'code', cardinality: '[1..1]', definition: 'Identity of the concept' },
        { name: 'display', type: 'string', cardinality: '[0..1]', definition: 'Text representation of the concept' },
        { name: 'definition', type: 'string', cardinality: '[0..1]', definition: 'Formal definition of the concept' },
        { name: 'system', type: 'uri', cardinality: '[1..1]', definition: 'Canonical URI for the code system' },
      ],
    };

    res.json({
      json: fhirResource,
      xml: xmlResource,
      ndjson: JSON.stringify(fhirResource),
      uml: umlDefinition,
    });
  } catch (error) {
    next(error);
  }
});

function convertFhirBundleToXml(bundle: any): string {
  const entriesXml = bundle.entry.map((e: any) => `
    <entry>
      <fullUrl value="${escapeXml(e.fullUrl)}"/>
      <resource>
        <CodeSystem>
          <id value="${escapeXml(e.resource.id)}"/>
          <url value="${escapeXml(e.resource.url)}"/>
          <version value="${escapeXml(e.resource.version)}"/>
          <name value="${escapeXml(e.resource.name)}"/>
          <title value="${escapeXml(e.resource.title)}"/>
          <status value="${escapeXml(e.resource.status)}"/>
          <publisher value="${escapeXml(e.resource.publisher)}"/>
          <description value="${escapeXml(e.resource.description)}"/>
          <concept>
            <code value="${escapeXml(e.resource.concept[0].code)}"/>
            <display value="${escapeXml(e.resource.concept[0].display)}"/>
            <definition value="${escapeXml(e.resource.concept[0].definition)}"/>
          </concept>
        </CodeSystem>
      </resource>
    </entry>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Bundle xmlns="http://hl7.org/fhir">
  <id value="${escapeXml(bundle.id)}"/>
  <type value="${escapeXml(bundle.type)}"/>
  <timestamp value="${escapeXml(bundle.timestamp)}"/>
  <total value="${bundle.total}"/>${entriesXml}
</Bundle>`;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getSystemUri(system: string): string {
  switch (system.toUpperCase()) {
    case 'LOINC': return 'http://loinc.org';
    case 'ICD10': return 'http://hl7.org/fhir/sid/icd-10';
    case 'SNOMED': return 'http://snomed.info/sct';
    case 'RXNORM': return 'http://www.nlm.nih.gov/research/umls/rxnorm';
    case 'CPT': return 'http://www.ama-assn.org/go/cpt';
    case 'ISBT128': return 'http://isbt128.org';
    default: return 'http://hospital.org/fhir/CodeSystem';
  }
}

export default router;
