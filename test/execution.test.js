const dotenv = require('dotenv');
// const { execute } = require('../src/execution');
// const { defaultLoadElm, defaultLoadPatients } = require('../src/fixtureLoader');

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const vsac = require('cql-exec-vsac');
const {
  executeCql,
} = require('cdss-common/src/cdss-module');
const yaml2fhir = require('../src/yaml2fhir/yaml2fhir');
const {
  defaultLoadElm,
  defaultLoadPatients,
} = require('../src');
const {
  getCurrentTime,
  getNumberOfDays,
  getNumberOfMonths,
  getNumberOfWeeks,
} = require('./timeUtil');


// Initialize the env variables
dotenv.config();

const API_KEY = process.env.VSAC_API_KEY;
const VALUESETS_CACHE = process.env.VALUESETS;
let elms;
let patientBundles;

beforeAll(() => {
  // Set up necessary data for cql-execution
  elms = defaultLoadElm();

  // patientBundles = defaultCustomPatients();
  const bundles = defaultLoadPatients();
  patientBundles = {};
  bundles.forEach((bundle) => {
    patientBundles[bundle.id] = bundle;
  });
});

describe('MMR Rule 1 Tests', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be < 12 mon, No previous dose, Recommendations should be Schedule 1st dose 12-15 mon of age AND Schedule 2nd dose 4-6 yr of age', async () => {
    const rule = elms.MMR1regularyoungerthan12monthsNoMMRRecommendation;

    const patient = patientBundles.MMR1regularyoungerthan12monthsNoMMRRecommendation.entry[0].resource;
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true, true);
    const result = await executeCql(patient, rule, libraries, { 'Imm': [] }, codeService, API_KEY);
    expect(result)
      .not
      .toBeNull();
    // console.log(JSON.stringify(result, null, 2));
    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);

    const now = new Date();

    const ageInMonths = getNumberOfMonths(patientBod, now);

    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(ageInMonths)
      .toBeLessThan(12);
    expect(ageInMonths)
      .toBeGreaterThan(0);

    expect(patientResult.Recommendations)
      .toHaveLength(2);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Recommendation 1: Schedule 1st dose MMR when patient is 12-15 months'));

    expect(patientResult.Recommendations[1].recommendation)
      .toEqual(expect.stringContaining('Recommendation 2: Schedule 2nd dose MMR when patient is 4-6 years'));
  });
});

describe('MMR Rule 2 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be >= 12 mon AND <= 47 mon, No previous dose, Recommendations should be Administer 1st dose AND Schedule 2nd dose 4-6 yr of age', async () => {
    const rule = elms.MMR2regularyoungerthan12_47monthsNoMMRRecommendation;
    const patient = patientBundles.MMR2regularyoungerthan12_47monthsNoMMRRecommendation.entry[0].resource;
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { 'Imm': [] }, codeService, API_KEY);
    expect(result)
      .not
      .toBeNull();

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);

    const now = new Date();

    const ageInMonths = getNumberOfMonths(patientBod, now);
    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(ageInMonths)
      .toBeGreaterThanOrEqual(12);
    expect(ageInMonths)
      .toBeLessThanOrEqual(47);

    expect(patientResult.Recommendations)
      .toHaveLength(2);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Recommendation 1: Adminster 1st dose'));

    expect(patientResult.Recommendations[1].recommendation)
      .toEqual(expect.stringContaining('Schedule 2nd dose 4-6 yr of age'));
  });
});

describe('MMR Rule 3 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be > 47 mon AND <= 18 yrs, No previous dose, Recommendations should be Administer 1st dose AND Schedule 2nd dose > = 4 wk of 1st dose', async () => {
    const rule = elms.MMR3regularyoungerthan47months_18yrsNoMMRRecommendation;
    const patient = patientBundles.MMR3regularyoungerthan47months_18yrsNoMMRRecommendation.entry[0].resource;
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { 'Imm': [] }, codeService, API_KEY);
    expect(result)
      .not
      .toBeNull();

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);

    const now = new Date();

    const ageInMonths = getNumberOfMonths(patientBod, now);
    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(ageInMonths)
      .toBeGreaterThanOrEqual(47);
    expect(ageInMonths)
      .toBeLessThanOrEqual(18 * 12);

    expect(patientResult.Recommendations)
      .toHaveLength(2);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Recommendation 1: Adminster 1 dose'));

    expect(patientResult.Recommendations[1].recommendation)
      .toEqual(expect.stringContaining('Recommendation 2: Schedule 2nd dose > = 4 wk of 1st dose'));
  });
});

describe('MMR Rule 4 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be > 12 mon AND < 4 yr, Single does of MMR administered at 12 - 15 mon of age, Recommendation should be Schedule 2nd dose 4-6 yr of age', async () => {
    const rule = elms.MMR4regular12months_4yrs_OneMMRRecommendation;
    const patient = patientBundles.MMR4regular12months_4yrs_OneMMRRecommendation.entry[0].resource;

    // const patient = firstPatientBundle.entry[0].resource;
    const immunization = patientBundles.MMR4regular12months_4yrs_OneMMRRecommendation.entry[1].resource;
    const immBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: immunization }],
    };
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { Imm: immBundle }, codeService, API_KEY);

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);
    const immunizationAdminDate = new Date(immunization.occurrenceDateTime);

    const now = new Date();
    const ageInMonths = getNumberOfMonths(patientBod, now);
    const adminAgeInMonths = getNumberOfMonths(patientBod, immunizationAdminDate);

    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(ageInMonths)
      .toBeLessThan(4 * 12);
    expect(ageInMonths)
      .toBeGreaterThan(12);
    expect(adminAgeInMonths)
      .toBeLessThan(15);
    expect(adminAgeInMonths)
      .toBeGreaterThan(12);
    expect(immBundle.entry)
      .toHaveLength(1);
    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Schedule 2nd dose MMR when patient is 4-6 years old'));
  });
});

describe('MMR Rule 5 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be > 12 mon AND < 4 yr, Single does of MMR administered at < 12 mon OR > 15 mon and current date must be >= 4 weeks since last admin date, Recommendation should be Administer 2nd Dose', async () => {
    const rule = elms.MMR5regular12months_4yrs_OneDoseOutOf12to15MonRecommendation;
    const patient = patientBundles.MMR5regular12months_4yrs_OneDoseOutOf12to15MonRecommendation1.entry[0].resource;

    const immunization = patientBundles.MMR5regular12months_4yrs_OneDoseOutOf12to15MonRecommendation1.entry[1].resource;
    const immBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: immunization }],
    };
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { Imm: immBundle }, codeService, API_KEY);

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);
    const immunizationAdminDate = new Date(immunization.occurrenceDateTime);

    const now = new Date();
    const ageInMonths = getNumberOfMonths(patientBod, now);
    const adminAgeInMonths = getNumberOfMonths(patientBod, immunizationAdminDate);

    const weeksSinceFirstDose = getNumberOfWeeks(immunizationAdminDate, new Date());
    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(patientResult.InPopulation)
      .toBeTruthy();
    expect(ageInMonths)
      .toBeLessThan(4 * 12);
    expect(ageInMonths)
      .toBeGreaterThan(12);

    expect(adminAgeInMonths < 12 || adminAgeInMonths > 15)
      .toBeTruthy();

    expect(weeksSinceFirstDose)
      .toBeGreaterThanOrEqual(4);
    expect(immBundle.entry)
      .toHaveLength(1);
    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Administer 2nd dose MMR'));
  });
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be > 12 mon AND < 4 yr, Single does of MMR administered at < 12 mon OR > 15 mon and current date must be >= 4 weeks since last admin date, Recommendation should be Administer 2nd Dose', async () => {
    const rule = elms.MMR5regular12months_4yrs_OneDoseOutOf12to15MonRecommendation;
    const patient = patientBundles.MMR5regular12months_4yrs_OneDoseOutOf12to15MonRecommendation2.entry[0].resource;

    const immunization = patientBundles.MMR5regular12months_4yrs_OneDoseOutOf12to15MonRecommendation2.entry[1].resource;
    const immBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: immunization }],
    };
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { Imm: immBundle }, codeService, API_KEY);

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);
    const immunizationAdminDate = new Date(immunization.occurrenceDateTime);

    const now = new Date();
    const ageInMonths = getNumberOfMonths(patientBod, now);
    const adminAgeInMonths = getNumberOfMonths(patientBod, immunizationAdminDate);

    const weeksSinceFirstDose = getNumberOfWeeks(immunizationAdminDate, new Date());
    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(patientResult.InPopulation)
      .toBeTruthy();
    expect(ageInMonths)
      .toBeLessThan(4 * 12);
    expect(ageInMonths)
      .toBeGreaterThan(12);

    expect(adminAgeInMonths < 12 || adminAgeInMonths > 15)
      .toBeTruthy();

    expect(weeksSinceFirstDose)
      .toBeGreaterThanOrEqual(4);
    expect(immBundle.entry)
      .toHaveLength(1);
    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Administer 2nd dose MMR'));
  });

});

describe('MMR Rule 6 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be > 12 mon AND < 4 yr, Single does of MMR administered at < 12 mon OR > 15 mon and current date must be < 4 weeks since last admin date, Recommendation should be Schedule 2nd dose >= 4 wk of 1st dose', async () => {
    const rule = elms.MMR6regular12months_4yrs_OneDoseOutOf12to15MonRecommendation;
    const patient = patientBundles.MMR6regular12months_4yrs_OneDoseOutOf12to15MonRecommendation1.entry[0].resource;

    const immunization = patientBundles.MMR6regular12months_4yrs_OneDoseOutOf12to15MonRecommendation1.entry[1].resource;
    const immBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: immunization }],
    };
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { Imm: immBundle }, codeService, API_KEY);

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);
    const immunizationAdminDate = new Date(immunization.occurrenceDateTime);

    const now = new Date();
    const ageInMonths = getNumberOfMonths(patientBod, now);
    const adminAgeInMonths = getNumberOfMonths(patientBod, immunizationAdminDate);

    const weeksSinceFirstDose = getNumberOfWeeks(immunizationAdminDate, new Date());
    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(patientResult.InPopulation)
      .toBeTruthy();
    expect(ageInMonths)
      .toBeLessThan(4 * 12);
    expect(ageInMonths)
      .toBeGreaterThan(12);

    expect(adminAgeInMonths < 12 || adminAgeInMonths > 15)
      .toBeTruthy();

    expect(weeksSinceFirstDose)
      .toBeLessThan(4);
    expect(immBundle.entry)
      .toHaveLength(1);
    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Schedule 2nd dose >= 4 wk of 1st dose'));
  });
});

describe('MMR Rule 7 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be >= 12 4 yr AND <= 18 yr, Single does of MMR administered and  current date must be >= 4 weeks since last admin date, Recommendation should be Administer 2nd dose', async () => {
    const rule = elms.MMR7regular4_18yrs_OneDoseRecommendation;
    const patient = patientBundles.MMR7regular4_18yrs_OneDoseRecommendation.entry[0].resource;

    const immunization = patientBundles.MMR7regular4_18yrs_OneDoseRecommendation.entry[1].resource;
    const immBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: immunization }],
    };
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { Imm: immBundle }, codeService, API_KEY);

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);
    const immunizationAdminDate = new Date(immunization.occurrenceDateTime);

    const now = new Date();
    const ageInMonths = getNumberOfMonths(patientBod, now);

    const weeksSinceFirstDose = getNumberOfWeeks(immunizationAdminDate, new Date());
    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(patientResult.InPopulation)
      .toBeTruthy();
    expect(ageInMonths)
      .toBeLessThanOrEqual(18 * 12);
    expect(ageInMonths)
      .toBeGreaterThanOrEqual(4 * 12);

    expect(weeksSinceFirstDose)
      .toBeGreaterThanOrEqual(4);
    expect(immBundle.entry)
      .toHaveLength(1);
    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Administer 2nd dose MMR'));
  });
});

describe('MMR Rule 8 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, Patient birthdate should be >= 12 4 yr AND <= 18 yr, Single does of MMR administered and  current date must be < 4 weeks since last admin date, Recommendation should be Schedule 2nd dose MMR >= 4 weeks from 1st dose', async () => {
    const rule = elms.MMR8regular4_18yrs_OneDoseRecommendation;
    const patient = patientBundles.MMR8regular4_18yrs_OneDoseRecommendation.entry[0].resource;

    const immunization = patientBundles.MMR8regular4_18yrs_OneDoseRecommendation.entry[1].resource;
    const immBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: immunization }],
    };
    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true);
    const result = await executeCql(patient, rule, libraries, { Imm: immBundle }, codeService, API_KEY);

    const patientResult = result[patient.id];

    const patientBod = new Date(patient.birthDate);
    const immunizationAdminDate = new Date(immunization.occurrenceDateTime);

    const now = new Date();
    const ageInMonths = getNumberOfMonths(patientBod, now);

    const weeksSinceFirstDose = getNumberOfWeeks(immunizationAdminDate, new Date());
    expect(patientResult.VaccineName)
      .toEqual('Measles, Mumps, and Rubella Virus Vaccine');
    expect(patientResult.InPopulation)
      .toBeTruthy();
    expect(ageInMonths)
      .toBeLessThanOrEqual(18 * 12);
    expect(ageInMonths)
      .toBeGreaterThanOrEqual(4 * 12);

    expect(weeksSinceFirstDose)
      .toBeLessThan(4);
    expect(immBundle.entry)
      .toHaveLength(1);
    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Schedule 2nd dose MMR >= 4 weeks from 1st dose'));
  });
});

describe('MMR Rule 9 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, with Pregnancy Condition, No previous dose, Recommendation should be Schedule/admin 1st dose after pregnancy AND Schedule 2nd dose >= 4 wk of 1st dose', async () => {

    const rule = elms.MMR9MedicalContraPrecautionMMRRecommendation;
    const patient = patientBundles.MMR9MedicalContraPrecautionMMRRecommendation.entry[0].resource;

    // const patient = firstPatientBundle.entry[0].resource;
    const condition = patientBundles.MMR9MedicalContraPrecautionMMRRecommendation.entry[1].resource;

    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true, true);
    const result = await executeCql(patient, rule, libraries, {
      Imm: [],
      Conditions: [condition],
    }, codeService, API_KEY);
    const patientResult = result[patient.id];

    expect(patientResult.Recommendations)
      .toHaveLength(2);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Recommendation 1: Schedule 1st dose MMR after pregnancy'));

    expect(patientResult.Recommendations[1].recommendation)
      .toEqual(expect.stringContaining('Recommendation 2: Schedule 2nd dose MMR after 4 weeks of 1st dose'));
  });
});

describe('MMR Rule 10 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, with Pregnancy Condition, One previous dose, Recommendation should be Schedule/admin 2nd dose after pregnancy, >= 4 wk of 1st dose', async () => {

    const rule = elms.MMR10MedicalContraPrecautionMMRRecommendation;
    const patient = patientBundles.MMR10MedicalContraPrecautionMMRRecommendation.entry[0].resource;

    // const patient = firstPatientBundle.entry[0].resource;
    const condition = patientBundles.MMR10MedicalContraPrecautionMMRRecommendation.entry[1].resource;
    const immunization = patientBundles.MMR10MedicalContraPrecautionMMRRecommendation.entry[2].resource;

    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true, true);
    const result = await executeCql(patient, rule, libraries, {
      Imm: [immunization],
      Conditions: [condition],
    }, codeService, API_KEY);
    const patientResult = result[patient.id];

    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('Schedule/admininster 2nd dose after pregnancy, >= 4 wk of 1st dose'));

  });
});

describe('MMR Rule 11 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, with Immunocompromised Condition,  Recommendation should be DO NOT ADMINISTER OR SCHEDULE MMR', async () => {

    const rule = elms.MMR11MedicalContraPrecautionMMRRecommendation_Immunocompromised;
    const patient = patientBundles.MMR11MedicalContraPrecautionMMRRecommendation_Immunocompromised.entry[0].resource;

    // const patient = firstPatientBundle.entry[0].resource;
    const condition = patientBundles.MMR11MedicalContraPrecautionMMRRecommendation_Immunocompromised.entry[1].resource;

    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true, true);
    const result = await executeCql(patient, rule, libraries, {
      Conditions: [condition],
    }, codeService, API_KEY);
    const patientResult = result[patient.id];

    expect(patientResult.Recommendations)
      .toHaveLength(1);
    expect(patientResult.Recommendations[0].recommendation)
      .toEqual(expect.stringContaining('DO NOT ADMINISTER OR SCHEDULE MMR'));

  });
});

describe('MMR Rule 12 Tests ', () => {
  test('VaccineName should be Measles, Mumps, and Rubella Virus Vaccine, with Immunocompromised Condition,  Recommendation should be DO NOT ADMINISTER OR SCHEDULE MMR', async () => {

    const rule = elms.MMR12MedicalContraPrecautionMMRRecommendation_HIVImmunocompromised;
    const patient = patientBundles.MMR12MedicalContraPrecautionMMRRecommendation_HIVImmunocompromised.entry[0].resource;

    // const patient = firstPatientBundle.entry[0].resource;
    const condition = patientBundles.MMR12MedicalContraPrecautionMMRRecommendation_HIVImmunocompromised.entry[1].resource;

    const libraries = {
      FHIRHelpers: elms.FHIRHelpers,
      Common: elms.MMR_Common_Library,
    };
    const codeService = new vsac.CodeService(VALUESETS_CACHE, true, true);
    const result = await executeCql(patient, rule, libraries, {
      Conditions: [condition],
      Observations: [],
    }, codeService, API_KEY);
    const patientResult = result[patient.id];

    console.log(JSON.stringify(patientResult, null, 2));
    // expect(patientResult.Recommendations)
    //   .toHaveLength(1);
    // expect(patientResult.Recommendations[0].recommendation)
    //   .toEqual(expect.stringContaining('DO NOT ADMINISTER OR SCHEDULE MMR'));

  });
});

