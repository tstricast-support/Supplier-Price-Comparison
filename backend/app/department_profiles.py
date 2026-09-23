"""
Per-department letterhead used on Purchase Orders.

Each department prints its own logo, company name, address and phone on the
PO. Everything below is SAMPLE data - replace the strings with the real
details later; nothing else needs to change.

`logo_url` can be:
  - "" (empty)  -> the PO prints `logo_text` in `logo_color` as a wordmark
  - a URL       -> the PO prints that image instead (e.g.
                   "https://yoursite.com/static/dd-engineering.png")

Keys are Department.code values seeded by seed.py.
"""

DEPARTMENT_PO_PROFILES = {
    "i_lab": {
        "po_prefix": "ILAB",
        "company_name": "I Lab (Pvt) Ltd",
        "address_line1": " 17/A SIRI KURUSA ROAD,",
        "address_line2": "GAMPAHA, Sri Lanka",
        "phone": "+94 70 460 2606",
        "email": "",
        "website": "",
        "contact_person": "Procurement Officer",
        "logo_text": "I LAB",
        "logo_color": "#be185d",
        "logo_url": "/logos/i-lab.png",
    },
    "i_photobook": {
        "po_prefix": "IPB",
        "company_name": "I Lab (Pvt) Ltd",
        "address_line1": " 17/A SIRI KURUSA ROAD,",
        "address_line2": "GAMPAHA, Sri Lanka",
        "phone": "+94 70 460 2606",
        "email": "",
        "website": "",
        "contact_person": "Procurement Officer",
        "logo_text": "I PHOTOBOOK",
        "logo_color": "#be185d",
        # NOTE: your file is currently named "i photobook.png" (with a space).
        # Rename it to "i-photobook.png" to match the others - browsers can
        # choke on spaces in URLs. If you'd rather not rename it, use
        # "/logos/i%20photobook.png" here instead (the %20 is a literal space).
        "logo_url": "/logos/i-photobook.png",
    },
    "i_lab_std": {
        "po_prefix": "ILABSTD",
        "company_name": "I Lab std (Pvt) Ltd",
        "address_line1": " 17/A SIRI KURUSA ROAD,",
        "address_line2": "GAMPAHA, Sri Lanka",
        "phone": " +94 70 460 2606",
        "email": "",
        "website": "",
        "contact_person": "Procurement Officer",
        "logo_text": "I LAB STD",
        "logo_color": "#0f766e",
        "logo_url": "/logos/i-lab-std.png",
    },
    "dd_engineering": {
        "po_prefix": "DDENG",
        "company_name": "DD Engineering (Pvt) Ltd",
        "address_line1": " 17/A SIRI KURUSA ROAD,",
        "address_line2": "GAMPAHA, Sri Lanka",
        "phone": "+94 77 322 2602",
       "email": "",
        "website": "",
        "contact_person": "Procurement Officer",
        "logo_text": "DD ENGINEERING",
        "logo_color": "#b45309",
        "logo_url": "/logos/dd-engineering.png",
    },
        "tricast": {
        "po_prefix": "TRICAST",
        "company_name": "Tricast (Pvt) Ltd",
        "address_line1": " 17/A SIRI KURUSA ROAD,",
        "address_line2": "GAMPAHA, Sri Lanka",
        "phone": "+94 70 460 2606",
        "email": "",
        "website": "",
        "contact_person": "Procurement Officer",
        "logo_text": "TRICAST",
        "logo_color": "#213A70",
        "logo_url": "/logos/tricast.png",
    },
}

# Used when a department has no `code` (or an unknown one) so the PO still prints.
DEFAULT_PO_PROFILE = {
    "po_prefix": "PO",
    "company_name": "Company Name",
    "address_line1": "123 Main Street",
    "address_line2": "Colombo, Sri Lanka",
    "phone": "(321) 456-7890",
    "email": "email@example.com",
    "website": "www.yourwebaddress.com",
    "contact_person": "Point of Contact",
    "logo_text": "YOUR LOGO",
    "logo_color": "#9ca3af",
    "logo_url": "",
}


def profile_for(department) -> dict:
    """Letterhead for a Department ORM row, falling back to a safe default."""
    base = DEPARTMENT_PO_PROFILES.get(department.code or "", DEFAULT_PO_PROFILE)
    return {**base, "department_id": department.id, "department_name": department.name}

# Some departments print their own letterhead but don't own a product
# catalog of their own - they pick items from OTHER departments' catalogs
# instead. Keys are the PO department's `code`; values are the department
# `code`s whose products should be offered as pickable items.
# A department not listed here just uses its own products, as before.
PO_ITEM_SOURCE_DEPARTMENT_CODES = {
    "tricast": ["i_lab", "i_photobook"],
}


def item_source_codes(department) -> list[str]:
    """Which department code(s)' products are pickable on this department's PO.
    Defaults to just the department's own code."""
    return PO_ITEM_SOURCE_DEPARTMENT_CODES.get(department.code or "", [department.code])