const cql = require('cql-execution');
const cqlfhir = require('../src/index');
const {expect} = require('chai');

// Placeholder test
describe('#DSTU2', () => {
  let patientSource;
  before(() => {
    patientSource = cqlfhir.PatientSource.FHIRv102();
  });

  beforeEach(() => {
    patientSource.loadBundles([
      require('./fixtures/dstu2/Myron933_Ondricka197_a901d2b4-30a8-41b9-b94a-f44561d8f809.json'),
      require('./fixtures/dstu2/Shawnee493_Osinski784_60d5c7b1-53ee-49ca-a33a-945004d6b84f.json')
    ]);
  });

  afterEach(() => patientSource.reset());

  it('should report version as 1.0.2', () => {
    expect(patientSource.version).to.equal('1.0.2');
  });

  it('should properly iterate test patients', () => {
    // Check first patient
    const myron = patientSource.currentPatient();
    expect(myron.getId()).to.equal('bb5e0a4a-bcb8-448b-ab0a-69f639b7dd88');
    // Check next patient
    const shawnee = patientSource.nextPatient();
    expect(shawnee.getId()).to.equal('22f02aa3-6f09-4292-a2c1-839557416782');
    // No more patients should result in undefined
    expect(patientSource.nextPatient()).to.be.undefined;
    expect(patientSource.currentPatient()).to.be.undefined;
  });

  it('should set the current patient to the next when nextPatient is called', () => {
    const originalCurrent = patientSource.currentPatient();
    const nextPatient = patientSource.nextPatient();
    const newCurrent = patientSource.currentPatient();
    expect(newCurrent).not.to.deep.equal(originalCurrent);
    expect(newCurrent).to.deep.equal(nextPatient);
  });

  it('should clone currentPatient each time it is called', () => {
    expect(patientSource.currentPatient()).to.deep.equal(patientSource.currentPatient());
    expect(patientSource.currentPatient()).to.not.equal(patientSource.currentPatient());
  });

  it('should find patient birthDate', () =>{
    const pt = patientSource.currentPatient();
    // cql-execution v1.3.2 currently doesn't export the new Date class, so we need to use the .getDate() workaround
    expect(compact(pt.get('birthDate'))).to.deep.equal({ value: new cql.DateTime.parse('1975-02-25').getDate() });
    expect(pt.get('birthDate.value')).to.deep.equal(new cql.DateTime.parse('1975-02-25').getDate());
  });

  it('should find patient extensions', () =>{
    const pt = patientSource.currentPatient();
    const extensions = pt.get('extension');
    expect(extensions).to.have.length(7);
    //Check the first and last ones
    expect(compact(extensions[0])).to.deep.equal({
      url: 'http://hl7.org/fhir/StructureDefinition/us-core-race',
      valueCodeableConcept: {
        coding: [
          {
            system: { value: 'http://hl7.org/fhir/v3/Race' },
            code: { value: '2106-3' },
            display: { value: 'White' }
          }
        ],
        text: { value: 'White' }
      }
    });
    expect(compact(extensions[6])).to.deep.equal({
      url: 'http://synthetichealth.github.io/synthea/quality-adjusted-life-years',
      valueDecimal: { value: 40.353136402148294 }
    });
  });

  it('should find records by type name (e.g., Condition)', () =>{
    const pt = patientSource.currentPatient();
    const conditions = pt.findRecords('Condition');
    expect(conditions).to.have.length(9);
    expect(conditions.every(c => c.getTypeInfo().name === 'FHIR.Condition')).to.be.true;
    const paymentReconciliations = pt.findRecords('PaymentReconciliation');
    expect(paymentReconciliations.length).to.be.empty;
  });

  it('should find records by model name and type name (e.g., FHIR.Condition)', () =>{
    const pt = patientSource.currentPatient();
    const conditions = pt.findRecords('FHIR.Condition');
    expect(conditions).to.have.length(9);
    expect(conditions.every(c => c.getTypeInfo().name === 'FHIR.Condition')).to.be.true;
    const paymentReconciliations = pt.findRecords('FHIR.PaymentReconciliation');
    expect(paymentReconciliations.length).to.be.empty;
  });

  it('should find records by model URL and type name (e.g., {http://hl7.org/fhir}Condition)', () =>{
    const pt = patientSource.currentPatient();
    const conditions = pt.findRecords('{http://hl7.org/fhir}Condition');
    expect(conditions).to.have.length(9);
    expect(conditions.every(c => c.getTypeInfo().name === 'FHIR.Condition')).to.be.true;
    const paymentReconciliations = pt.findRecords('{http://hl7.org/fhir}PaymentReconciliation');
    expect(paymentReconciliations.length).to.be.empty;
  });

  it('should find a single record', () =>{
    const pt = patientSource.currentPatient();
    const condition = pt.findRecord('Condition');
    expect(condition.getTypeInfo().name).to.equal('FHIR.Condition');
    expect(condition.getId()).to.equal('3c57b73b-6f28-45e7-9729-b681a1ec4156');
    const paymentReconciliation = pt.findRecord('PaymentReconciliation');
    expect(paymentReconciliation).to.be.undefined;
  });

  it('should support getId', () => {
    const pt = patientSource.currentPatient();
    const procedure = pt.findRecords('Procedure').find(p => p.getId() === '9d6f2ff7-f7f2-4dbb-a271-8a8c3c501e18');
    expect(procedure.getId()).to.equal('9d6f2ff7-f7f2-4dbb-a271-8a8c3c501e18');
  });

  it('should support getCode', () => {
    const pt = patientSource.currentPatient();
    const procedure = pt.findRecords('Procedure').find(p => p.getId() === '9d6f2ff7-f7f2-4dbb-a271-8a8c3c501e18');
    expect(procedure.getCode('code')).to.deep.equal(new cql.Code('117015009', 'http://snomed.info/sct', undefined, 'Throat culture (procedure) '));
  });

  it('should support getDate (DateTime)', () => {
    const pt = patientSource.currentPatient();
    const condition = pt.findRecords('Encounter').find(p => p.getId() === 'df950a26-42f3-4db1-93b5-50ba3cec264e');
    const periodStart = condition.getDate('period.start.value');
    expect(periodStart.isDateTime).to.be.true;
    expect(periodStart).to.deep.equal(cql.DateTime.parse('1994-07-19T09:18:56-04:00'));
  });

  it('should support getDate (Date)', () => {
    const pt = patientSource.currentPatient();
    const condition = pt.findRecords('Condition').find(p => p.getId() === '3c57b73b-6f28-45e7-9729-b681a1ec4156');
    const dateRecorded = condition.getDate('dateRecorded.value');
    expect(dateRecorded.isDate).to.be.true;
    expect(dateRecorded).to.deep.equal(cql.DateTime.parse('1994-07-19').getDate());
  });

  it('should support getDateOrInterval (DateTime)', () => {
    const pt = patientSource.currentPatient();
    const condition = pt.findRecords('Encounter').find(p => p.getId() === 'df950a26-42f3-4db1-93b5-50ba3cec264e');
    const periodStart = condition.getDateOrInterval('period.start.value');
    expect(periodStart.isDateTime).to.be.true;
    expect(periodStart).to.deep.equal(cql.DateTime.parse('1994-07-19T09:18:56-04:00'));
  });

  it('should support getDateOrInterval (Date)', () => {
    const pt = patientSource.currentPatient();
    const condition = pt.findRecords('Condition').find(p => p.getId() === '3c57b73b-6f28-45e7-9729-b681a1ec4156');
    const dateRecorded = condition.getDateOrInterval('dateRecorded.value');
    expect(dateRecorded.isDate).to.be.true;
    expect(dateRecorded).to.deep.equal(cql.DateTime.parse('1994-07-19').getDate());
  });

  it('should support dot-separated-paths', () => {
    const pt = patientSource.currentPatient();
    const procedure = pt.findRecords('Procedure').find(p => p.getId() === '9d6f2ff7-f7f2-4dbb-a271-8a8c3c501e18');
    expect(procedure.get('performedPeriod.start.value')).to.deep.equal(cql.DateTime.parse('2009-03-01T08:18:56-05:00'));
  });

  it('should support getting booleans', () => {
    const pt = patientSource.currentPatient();
    const immunization = pt.findRecords('Immunization').find(p => p.getId() === '52bc722f-e5a3-4be2-bdf3-1001d9078165');
    expect(immunization.get('wasNotGiven.value')).to.be.false;
  });

  it('should support getting decimals', () => {
    const pt = patientSource.currentPatient();
    const daly = pt.get('extension').find(e => e.url === 'http://synthetichealth.github.io/synthea/disability-adjusted-life-years');
    expect(daly.get('valueDecimal.value')).to.deep.equal(1.6468635978517043);
  });

  it('should support getting integers', () => {
    const pt = patientSource.currentPatient();
    const claim = pt.findRecords('Claim').find(p => p.getId() === '391f6bb9-0a79-439b-b84f-3a3a7364c8db');
    expect(claim.get('diagnosis')[0].get('sequence.value')).to.equal(1);
  });

  it('should support getting strings', () => {
    const pt = patientSource.currentPatient();
    const procedure = pt.findRecords('Procedure').find(p => p.getId() === '9d6f2ff7-f7f2-4dbb-a271-8a8c3c501e18');
    expect(procedure.get('status.value')).to.deep.equal('completed');
  });

  it('should support getting dateTimes', () => {
    const pt = patientSource.currentPatient();
    const condition = pt.findRecords('Encounter').find(p => p.getId() === 'df950a26-42f3-4db1-93b5-50ba3cec264e');
    const periodStart = condition.get('period.start.value');
    expect(periodStart.isDateTime).to.be.true;
    expect(periodStart).to.deep.equal(cql.DateTime.parse('1994-07-19T09:18:56-04:00'));
  });

  it('should support getting dates', () => {
    const pt = patientSource.currentPatient();
    const condition = pt.findRecords('Condition').find(p => p.getId() === '3c57b73b-6f28-45e7-9729-b681a1ec4156');
    const dateRecorded = condition.get('dateRecorded.value');
    expect(dateRecorded.isDate).to.be.true;
    expect(dateRecorded).to.deep.equal(cql.DateTime.parse('1994-07-19').getDate());
  });

  it('should support getting times', () => {
    const pt = patientSource.currentPatient();
    const observation = pt.findRecords('Observation').find(p => p.getId() === '9c15c801-6bb5-47a7-a9db-8bad0cb6aa68');
    const valueTime = observation.get('valueTime.value');
    expect(valueTime.isTime()).to.be.true;
    expect(valueTime).to.deep.equal(cql.DateTime.parse('0000-01-01T18:23:47.376-05:00').getTime());
  });

  it('should support getting an option of a choice', () => {
    const pt = patientSource.currentPatient();
    const condition = pt.findRecords('Condition').find(p => p.getId() === '3c57b73b-6f28-45e7-9729-b681a1ec4156');
    // In DSTU2, you just fully spell out the choice (e.g., onset[x] datetime is retrieved as onsetDateTime)
    expect(condition.get('onsetDateTime.value')).to.deep.equal(cql.DateTime.parse('1994-07-19T09:18:56-04:00'));
  });

  it('should support id and extension on primitives', () => {
    const pt = patientSource.currentPatient();
    const goal = pt.findRecords('Goal').find(p => p.getId() === 'ba9ddc45-9800-4537-97db-df84891597e9');
    expect(goal.get('status.id')).to.equal('12345');
    expect(compact(goal.get('status.extension'))).to.deep.equal([ {
      url : 'http://example.org/fhir/StructureDefinition/originalText',
      valueCode : { value: 'progressing' }
    }]);
  });

  it('should support id on list of primitives', () => {
    const pt = patientSource.currentPatient();
    expect(compact(pt.get('address')[0].get('line'))).to.deep.equal([
      { value: '172 O\'Keefe Station' },
      { id: '2468', value: 'Floor 5' },
      { value: 'Apt. C' }
    ]);
  });
});

function compact(obj) {
  if (Array.isArray(obj)) {
    return obj.map(o => compact(o));
  } else if (obj == null || typeof obj !== 'object') {
    return obj;
  }
  const compacted = {};
  for (const prop in obj) {
    const value = obj[prop];
    if (value !== undefined) {
      compacted[prop] = compact(value);
    }

  }
  return compacted;
}