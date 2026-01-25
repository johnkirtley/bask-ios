1. The Core Philosophy: "Regional Interdependence"
   The foundational message for the user (specifically for your onboarding blurb) is that everything is connected. We decided to tell the user that while they might feel pain in their neck, the root cause is often in their foundation (hips and pelvis). This justifies why a "Tech Neck" program includes "Glute Bridges."

2. The Data Structure: scientificMetadata
   Instead of bloat-loading your main exercise JSON with duplicate links, we created a Centralized Metadata Object. This stores one "Scientific Summary" and 2-3 "Research Links" for each postural category.

The Categories are:

cervical: Deep neck stabilizers (Military Neck/Tech Neck).

scapular: Shoulder blade and upper back (Upper Cross).

lumbopelvic: Core, glutes, and pelvis (APT/Lower Back).

thoracic: Mid-back mobility and chest opening (TOS/Rib Flare).

posterior_chain: General flexibility (Hamstrings/Spine).

1. The Mapping Logic
   We mapped every exercise and stretch in your library to one of those five keys.

Example: Chin Tuck → cervical.

Example: Dead Bugs → lumbopelvic.

Example: Doorway Stretch → thoracic.

1. The UI Implementation: "Science Behind the Move"
   On the exercise detail screen, you are building a section (ideally hidden behind a 🎓 icon) that pulls data from the metadata object based on the exercise's category tag.

The "Why": A one-sentence plain-English explanation of the physiological benefit.

The "Proof": Direct links to JOSPT, PubMed, or Journal of Physical Therapy Science articles.

1. Summary of the Scientific "Why"
   Cervical: Acts as an internal brace to pull the head back.

Scapular: Retrains the trapezius to pull shoulders back and down.

Lumbopelvic: Stabilizes the "cylinder" to correct pelvic tilt.

Thoracic: Decompresses nerves and "thaws out" a frozen mid-back.

Posterior Chain: Lengthens the back line to prevent the pelvis from "tucking."

1. Summary of the Logic
   The Problem: Users view posture as localized pain.

The Solution: You implement Regional Interdependence.

The Implementation: You tag exercises with a category. Your UI looks up the summary and resources from the scientificMetadata object using that tag.

The Result: A premium, "physio-designed" experience that educates the user on why they are doing specific movements for their foundation.
