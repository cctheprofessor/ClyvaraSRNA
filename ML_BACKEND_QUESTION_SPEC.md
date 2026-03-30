# Question Generation Specification for ML Backend

## Critical Requirements

ALL questions MUST pass frontend validation or they will be rejected. This document defines the exact JSON structure required for each question type.

### What Gets Validated vs What Doesn't

**Validated (REQUIRED):**
- `id`: Must be non-empty string
- `question_text`: Must be non-empty string (not placeholder)
- `question_type`: Must be valid type
- Type-specific fields (options, correct_answer, etc.) - see each type below
- `rationale`/`explanation`: If present, must NOT be placeholder text ("rationale", "TODO", "TBD", "N/A", empty)

**NOT Validated (Optional Metadata):**
- `topic_id`: Stored but not validated - can be any string or omitted
- `difficulty`: Stored but not validated - recommend "easy", "medium", or "hard" if provided

The frontend will accept questions with or without `topic_id` and `difficulty`. These fields are for organizational purposes only.

## Common Requirements (ALL Question Types)

Every question MUST have:
- `id`: String (unique identifier, non-empty)
- `question_text`: String (non-empty, not placeholder text)
- `question_type`: String (one of the types below)

Optional fields (metadata - NOT validated but recommended):
- `topic_id`: String (topic identifier - stored but not validated)
- `difficulty`: String (one of: "easy", "medium", "hard" - stored but not validated)
- `rationale`: String (explanation of correct answer - must NOT be placeholder text like "rationale", "TODO", "TBD", "N/A", or empty strings)
- `explanation`: String (additional explanation - must NOT be placeholder text)

## Question Types

### 1. Multiple Choice (`multiple_choice`)

```json
{
  "id": "123",
  "question_type": "multiple_choice",
  "question_text": "What is the mechanism of action of propofol?",
  "topic_id": "387",
  "difficulty": "medium",
  "options": [
    {
      "id": "A",
      "text": "GABA-A receptor agonist"
    },
    {
      "id": "B",
      "text": "NMDA receptor antagonist"
    },
    {
      "id": "C",
      "text": "Sodium channel blocker"
    },
    {
      "id": "D",
      "text": "Calcium channel blocker"
    }
  ],
  "correct_answer": "A",
  "rationale": "Propofol enhances GABA-mediated inhibitory neurotransmission by acting as a positive allosteric modulator at GABA-A receptors."
}
```

**Validation Rules:**
- `options`: MUST be array with at least 2 items
- Each option MUST have:
  - `id`: String (typically "A", "B", "C", "D")
  - `text`: String (non-empty, NOT placeholder like "rationale", "explanation", etc.)
- `correct_answer`: MUST be a string matching one of the option IDs

### 2. Multi-Select (`multi_select`)

```json
{
  "id": "124",
  "question_type": "multi_select",
  "question_text": "Which of the following are contraindications to regional anesthesia? Select all that apply.",
  "topic_id": "391",
  "difficulty": "hard",
  "options": [
    {
      "id": "A",
      "text": "Patient refusal"
    },
    {
      "id": "B",
      "text": "Infection at insertion site"
    },
    {
      "id": "C",
      "text": "Coagulopathy"
    },
    {
      "id": "D",
      "text": "Hypertension"
    },
    {
      "id": "E",
      "text": "Allergy to local anesthetics"
    }
  ],
  "correct_answers": ["A", "B", "C", "E"]
}
```

**Validation Rules:**
- `options`: MUST be array with at least 2 items
- Each option MUST have:
  - `id`: String (typically "A", "B", "C", etc.)
  - `text`: String (non-empty, NOT placeholder text)
- `correct_answers`: MUST be array with at least 1 item, all items MUST match option IDs
- **CRITICAL**: DO NOT include options with IDs like "rationale", "explanation", etc.

### 3. Drag-Drop Matching (`drag_drop_matching`)

```json
{
  "id": "125",
  "question_type": "drag_drop_matching",
  "question_text": "Match each anesthetic agent with its primary mechanism",
  "topic_id": "387",
  "difficulty": "medium",
  "options": {
    "column_a": [
      {
        "id": "a1",
        "text": "Propofol"
      },
      {
        "id": "a2",
        "text": "Ketamine"
      },
      {
        "id": "a3",
        "text": "Rocuronium"
      }
    ],
    "column_b": [
      {
        "id": "b1",
        "text": "NMDA receptor antagonist"
      },
      {
        "id": "b2",
        "text": "GABA-A receptor agonist"
      },
      {
        "id": "b3",
        "text": "Nicotinic acetylcholine receptor antagonist"
      }
    ],
    "correct_pairs": {
      "a1": "b2",
      "a2": "b1",
      "a3": "b3"
    }
  }
}
```

**Validation Rules:**
- `options`: MUST be object containing:
  - `column_a`: Array with at least 1 item
  - `column_b`: Array with at least 1 item
  - `correct_pairs`: Object with at least 1 key-value pair
- Each column item MUST have:
  - `id`: String (unique within column)
  - `text`: String (non-empty)
- `correct_pairs`: MUST be object where keys are column_a IDs and values are column_b IDs
- **CRITICAL**: `correct_pairs` cannot be empty object `{}`

### 4. Drag-Drop Ordering (`drag_drop_ordering`)

```json
{
  "id": "126",
  "question_type": "drag_drop_ordering",
  "question_text": "Arrange the steps of spinal anesthesia in correct order",
  "topic_id": "391",
  "difficulty": "hard",
  "options": {
    "steps": [
      {
        "id": "step1",
        "text": "Position patient and perform sterile prep"
      },
      {
        "id": "step2",
        "text": "Identify interspace and administer local anesthetic"
      },
      {
        "id": "step3",
        "text": "Insert spinal needle and confirm CSF flow"
      },
      {
        "id": "step4",
        "text": "Inject intrathecal medication"
      },
      {
        "id": "step5",
        "text": "Remove needle and monitor patient"
      }
    ],
    "correct_order": ["step1", "step2", "step3", "step4", "step5"]
  }
}
```

**Validation Rules:**
- `options`: MUST be object containing:
  - `steps`: Array with at least 2 items
  - `correct_order`: Array with exactly same length as steps
- Each step MUST have:
  - `id`: String (unique)
  - `text`: String (non-empty)
- `correct_order`: MUST be array containing all step IDs in correct order
- **CRITICAL**: `correct_order` length MUST match `steps` length
- **CRITICAL**: `correct_order` cannot be empty array `[]`

### 5. Clinical Scenario (`clinical_scenario`)

```json
{
  "id": "127",
  "question_type": "clinical_scenario",
  "question_text": "Clinical Scenario: 68-year-old patient scheduled for total knee arthroplasty",
  "topic_id": "392",
  "difficulty": "hard",
  "options": {
    "vignette": "A 68-year-old male with BMI 32, history of hypertension and diabetes, presents for total knee arthroplasty. Vitals: BP 145/88, HR 72, SpO2 98% on room air. Takes metformin and lisinopril daily.",
    "sub_questions": [
      {
        "id": "127a",
        "question_type": "multiple_choice",
        "question_text": "What is the most appropriate anesthetic technique?",
        "options": [
          {
            "id": "A",
            "text": "General anesthesia only"
          },
          {
            "id": "B",
            "text": "Spinal anesthesia"
          },
          {
            "id": "C",
            "text": "Epidural anesthesia"
          },
          {
            "id": "D",
            "text": "MAC sedation"
          }
        ],
        "correct_answer": "B",
        "rationale": "Spinal anesthesia is ideal for lower extremity surgery with excellent analgesia and reduced thromboembolic risk."
      },
      {
        "id": "127b",
        "question_type": "multiple_choice",
        "question_text": "Which preoperative medication adjustment is required?",
        "options": [
          {
            "id": "A",
            "text": "Continue all medications as usual"
          },
          {
            "id": "B",
            "text": "Hold metformin on day of surgery"
          },
          {
            "id": "C",
            "text": "Hold lisinopril for 1 week"
          },
          {
            "id": "D",
            "text": "Start heparin preoperatively"
          }
        ],
        "correct_answer": "B",
        "rationale": "Metformin should be held on day of surgery due to risk of lactic acidosis, especially if contrast or renal compromise occurs."
      }
    ]
  }
}
```

**Validation Rules:**
- `options`: MUST be object containing:
  - `vignette`: String (non-empty clinical scenario description)
  - `sub_questions`: Array with at least 1 sub-question
- **CRITICAL**: `vignette` MUST be a STRING, not "[object Object]"
- Each sub-question is a COMPLETE question following all rules for its type
- Sub-questions MUST have:
  - Valid `id` (non-empty string)
  - Valid `question_type`
  - Valid `question_text`
  - All required fields for that question type
- **CRITICAL**: Do NOT create sub-questions with:
  - Empty IDs `""`
  - Empty options arrays `[]`
  - Empty correct_answer `""`
  - Placeholder text like "Question text not available"

### 6. Hotspot (`hotspot`)

```json
{
  "id": "128",
  "question_type": "hotspot",
  "question_text": "Click on the area representing the cricothyroid membrane",
  "topic_id": "390",
  "difficulty": "hard",
  "options": {
    "image_url": "https://example.com/neck-anatomy.jpg",
    "hotspot_zones": [
      {
        "id": "zone1",
        "x": 150,
        "y": 200,
        "width": 50,
        "height": 30,
        "is_correct": true
      },
      {
        "id": "zone2",
        "x": 150,
        "y": 250,
        "width": 50,
        "height": 30,
        "is_correct": false
      }
    ]
  }
}
```

**Validation Rules:**
- `options`: MUST be object containing:
  - `image_url`: String (valid URL)
  - `hotspot_zones`: Array with at least 1 zone
- Each zone MUST have:
  - `id`: String (unique)
  - `x`: Number (coordinate)
  - `y`: Number (coordinate)
  - `width`: Number (> 0)
  - `height`: Number (> 0)
  - `is_correct`: Boolean
- At least one zone MUST have `is_correct: true`

## Common Mistakes to Avoid

### ❌ DO NOT DO THIS:
```json
{
  "options": {
    "correct_pairs": {}  // Empty object - INVALID
  }
}
```

### ✅ DO THIS:
```json
{
  "options": {
    "correct_pairs": {
      "a1": "b1",
      "a2": "b2"
    }
  }
}
```

### ❌ DO NOT DO THIS:
```json
{
  "options": [
    {"id": "A", "text": "Option A"},
    {"id": "rationale", "text": "rationale"}  // Placeholder - INVALID
  ]
}
```

### ✅ DO THIS:
```json
{
  "options": [
    {"id": "A", "text": "Option A"},
    {"id": "B", "text": "Option B"}
  ]
}
```

### ❌ DO NOT DO THIS (Clinical Scenario):
```json
{
  "options": {
    "vignette": "[object Object]",  // Wrong type - INVALID
    "sub_questions": [
      {
        "id": "",  // Empty - INVALID
        "options": [],  // Empty - INVALID
        "correct_answer": ""  // Empty - INVALID
      }
    ]
  }
}
```

### ✅ DO THIS (Clinical Scenario):
```json
{
  "options": {
    "vignette": "A 45-year-old female presents for...",  // Proper string
    "sub_questions": [
      {
        "id": "127a",  // Valid ID
        "question_type": "multiple_choice",
        "question_text": "What is the most appropriate...",
        "options": [
          {"id": "A", "text": "Option A"},
          {"id": "B", "text": "Option B"}
        ],
        "correct_answer": "A"
      }
    ]
  }
}
```

## Validation Summary

Before returning ANY question, verify:
1. **Core fields**: `id`, `question_text`, `question_type` are present and non-empty
2. **Type-specific fields**: All required fields for the question type are present and valid
3. **No placeholder text**: rationale, explanation, and option text must NOT contain "rationale", "TODO", "TBD", "N/A", or be empty strings
4. **Arrays not empty**: Options arrays, correct_answers, correct_pairs, correct_order must have required minimum items
5. **ID references valid**: correct_answer matches an option ID, correct_answers reference valid IDs, correct_pairs keys/values match column IDs, correct_order contains all step IDs
6. **Clinical scenarios**: Vignette is a STRING (not "[object Object]"), sub-questions are COMPLETE questions with all required fields
7. **Option text quality**: Every option text must be meaningful content, not placeholders

## Testing Your Questions

Run this mental checklist:
- [ ] Does question have id (non-empty), question_text (non-empty), question_type (valid)?
- [ ] Are all REQUIRED fields for this type present and valid?
- [ ] Do all option IDs follow the pattern (A, B, C or a1, a2, etc.)?
- [ ] Does correct_answer/correct_answers reference valid option IDs that exist in options?
- [ ] For matching: Does correct_pairs have at least 1 pair? Keys match column_a IDs? Values match column_b IDs?
- [ ] For ordering: Does correct_order.length === steps.length? All IDs in correct_order exist in steps?
- [ ] For clinical: Is vignette a STRING (not "[object Object]")? Do all sub-questions have IDs, options, and correct answers?
- [ ] No placeholder text in rationale, explanation, or option text ("rationale", "TODO", "TBD", "N/A", empty strings)?
- [ ] Optional: Include topic_id (string) and difficulty ("easy"/"medium"/"hard") for better organization
