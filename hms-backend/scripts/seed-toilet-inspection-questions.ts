import "dotenv/config";
import { prisma } from "../src/prisma";
import { ToiletType } from "../generated/prisma";

async function main() {
    console.log("Cleaning up old questions...");
    await prisma.toiletInspectionQuestion.deleteMany({});

    const ctQuestions = [
        { text: "1. Is the toilet open and functional?", type: "YES_NO", requirePhoto: true },
        { text: "2. Is the community toilet displaying SBM messages or any other message promoting proper usage of toilets?", type: "YES_NO", requirePhoto: true },
        { text: "3. Is the toilet visible to passers-by with clear signage indicating the direction of community toilet?", type: "YES_NO", requirePhoto: true },
        { text: "4. Is the toilet mapped on Google Maps?", type: "YES_NO", requirePhoto: false },
        { text: "5. Whether the toilet has a caretaker present at all times?", type: "YES_NO", requirePhoto: true },
        { text: "6. Whether name and contact details of the caretaker is displayed on the toilet wall?", type: "YES_NO", requirePhoto: true },
        { text: "7. Name and contact number of the caretaker", type: "TEXT", requirePhoto: true },
        { text: "8. Is the community toilet accessible to the differently abled persons by providing ramp and hand railings to enter into the toilet?", type: "YES_NO", requirePhoto: true },
        { text: "9. Is the community toilet connected to a closed system such as sewerage, septic tank + soak pit, twin-pit system etc.?", type: "YES_NO", requirePhoto: true },
        { text: "10. Does the toilet have a mechanism to capture user feedback regarding cleanliness & hygiene of toilets (QR code / Telephone no. / IOT device / Register)?", type: "YES_NO", requirePhoto: true },
        {
            text: "11. What type of feedback mechanism is present?",
            type: "OPTIONS",
            options: ["QR Code", "Telephone No.", "IOT Device", "Register", "Other (if any)", "No Mechanism"],
            requirePhoto: true
        },
        {
            text: "12. Does the community toilet (including all toilet seats) have functional taps with continuous supply of water?",
            type: "OPTIONS",
            options: ["Taps available with continuous supply of water", "Taps available but no water supply", "No taps available"],
            requirePhoto: true
        },
        { text: "13. Does the community toilet (including all toilet seats) have adequate ventilation facility?", type: "YES_NO", requirePhoto: true },
        { text: "14. Does the community toilet have functional bolting & locking arrangement for each toilet seat compartment?", type: "YES_NO", requirePhoto: true },
        { text: "15. Are all the toilet seats clean and usable?", type: "YES_NO", requirePhoto: true },
        { text: "16. Are all the toilet seats free from bad odour?", type: "YES_NO", requirePhoto: false },
        {
            text: "17. Does all the toilet seats have functional flushing mechanisms?",
            type: "OPTIONS",
            options: ["Flushing mechanism is available and functional", "Flushing mechanism is available but not functional", "No flushing mechanism available"],
            requirePhoto: true
        },
        { text: "18. Are there litter bins available in the toilet?", type: "YES_NO", requirePhoto: true },
        {
            text: "19. Does the toilet have clean and usable wash basins with functional taps?",
            type: "OPTIONS",
            options: [
                "Wash basins are clean and in good working order, with taps that function properly",
                "Wash basins are clean and usable, but the taps are not functioning",
                "Wash basins are not clean or usable, but the taps are functioning",
                "Wash basins are neither clean nor usable, and the taps are not functioning",
                "There are no wash basins available"
            ],
            requirePhoto: true
        },
        {
            text: "20. Is the toilet premises well-lit at all times, both within and outside?",
            type: "OPTIONS",
            options: [
                "Yes, it's always bright inside and outside",
                "Yes, it's bright inside, but not outside",
                "Yes, it's bright outside, but not inside",
                "No, it's not bright inside or outside"
            ],
            requirePhoto: true
        },
        {
            text: "21. Is there always soap or a working soap dispenser and air freshener available in the community toilet?",
            type: "OPTIONS",
            options: [
                "Yes, soap or a working soap dispenser and air freshener are always available",
                "Yes, soap or a working soap dispenser is available, but no air freshener",
                "Yes, air freshener is available, but no soap or working soap dispenser",
                "No, neither soap nor air freshener is available"
            ],
            requirePhoto: true
        },
        { text: "22. Whether the women's section in the community toilet has sanitary napkin dispensing system in place?", type: "YES_NO", requirePhoto: true },
        { text: "23. Is there a separate collection bin for used pads?", type: "YES_NO", requirePhoto: true },
        {
            text: "24. Who manages the operation and maintenance (O&M) of these toilets?",
            type: "OPTIONS",
            options: ["ULB (Urban Local Body)", "Outsourced to Private Contractor", "Community-Based Organization (CBO) or NGO", "Other"],
            requirePhoto: false
        },
        { text: "25. Is there any dedicated user-friendly toilet seat for the differently abled?", type: "YES_NO", requirePhoto: true },
        { text: "26. Is there any dedicated toilet seat / compartment for the transgender?", type: "YES_NO", requirePhoto: true },
        { text: "27. Is there any dedicated toilet seat / compartment / urinal for children with low height?", type: "YES_NO", requirePhoto: true },
        { text: "28. Whether staff of the toilet are provided with necessary supplies, consumables, cleaning equipment & PPE?", type: "YES_NO", requirePhoto: true },
        { text: "29. Is there a roster available and being maintained for regular cleaning and maintenance of toilet?", type: "YES_NO", requirePhoto: true },
        { text: "30(a). Is the community toilet a water-efficient toilet?", type: "YES_NO", requirePhoto: true },
        {
            text: "30(b). What type of water-efficient mechanism is present in the toilet?",
            type: "OPTIONS",
            options: ["Water reuse system", "Water-efficient fixtures", "Any other", "No mechanism"],
            requirePhoto: true
        },
        { text: "30(c). Is the community toilet an energy-efficient / solar-enabled toilet?", type: "YES_NO", requirePhoto: true },
        {
            text: "30(d). What type of energy-efficient / solar mechanism is present in the toilet?",
            type: "OPTIONS",
            options: ["Use of solar panels", "No mechanism"],
            requirePhoto: true
        },
        { text: "31. Any additional remarks, observations or feedback by the assessor?", type: "TEXT", requirePhoto: true },
    ];

    const ptQuestions = [
        { text: "1. Is the toilet open and functional?", type: "YES_NO", requirePhoto: true },
        { text: "2. Is SBM or other message promoting proper usage displayed?", type: "YES_NO", requirePhoto: true },
        { text: "3. Is the toilet visible with clear signage?", type: "YES_NO", requirePhoto: true },
        { text: "4. Is the toilet mapped on Google Maps?", type: "YES_NO", requirePhoto: false },
        { text: "5. Is caretaker present at all times?", type: "YES_NO", requirePhoto: true },
        { text: "6. Are caretaker name & contact displayed?", type: "YES_NO", requirePhoto: true },
        { text: "7. Name & contact number of caretaker", type: "TEXT", requirePhoto: false },
        { text: "8. Is toilet accessible to differently-abled (ramps/railings)?", type: "YES_NO", requirePhoto: true },
        { text: "9. Is toilet connected to closed system (sewer/septic)?", type: "YES_NO", requirePhoto: true },
        { text: "10. Is user feedback mechanism present?", type: "YES_NO", requirePhoto: true },
        {
            text: "11. What type of feedback mechanism?",
            type: "OPTIONS",
            options: ["QR", "Phone", "IoT", "Register", "None"],
            requirePhoto: true
        },
        {
            text: "12. Is continuous water supply available?",
            type: "OPTIONS",
            options: ["Continuous", "Intermittent", "None"],
            requirePhoto: true
        },
        { text: "13. Is ventilation adequate?", type: "YES_NO", requirePhoto: true },
        { text: "14. Is proper bolting & locking present?", type: "YES_NO", requirePhoto: true },
        { text: "15. Are toilet seats clean & usable?", type: "YES_NO", requirePhoto: true },
        { text: "16. Are seats free from bad odour?", type: "YES_NO", requirePhoto: false },
        {
            text: "17. Is flushing mechanism functional?",
            type: "OPTIONS",
            options: ["Functional", "Non-functional", "None"],
            requirePhoto: true
        },
        { text: "18. Are bins available?", type: "YES_NO", requirePhoto: true },
        {
            text: "19. Are wash basins clean & functional?",
            type: "OPTIONS",
            options: ["Clean & Functional", "Clean but Non-functional", "Dirty but Functional", "Dirty & Non-functional", "None"],
            requirePhoto: true
        },
        {
            text: "20. Is lighting adequate inside & outside?",
            type: "OPTIONS",
            options: ["Both Inside & Outside", "Only Inside", "Only Outside", "None"],
            requirePhoto: true
        },
        {
            text: "21. Is soap/air freshener available?",
            type: "OPTIONS",
            options: ["Both", "Only Soap", "Only Air Freshener", "None"],
            requirePhoto: true
        },
        { text: "22. Is sanitary napkin dispenser present in women section?", type: "YES_NO", requirePhoto: true },
        { text: "23. Is separate bin for used pads available?", type: "YES_NO", requirePhoto: true },
        {
            text: "24. Who manages O&M?",
            type: "OPTIONS",
            options: ["ULB", "Contractor", "CBO", "Other"],
            requirePhoto: true
        },
        { text: "25. Is there a dedicated seat for differently-abled?", type: "YES_NO", requirePhoto: true },
        { text: "26. Is dedicated toilet for transgender available?", type: "YES_NO", requirePhoto: true },
        { text: "27. Is child-friendly urinal available?", type: "YES_NO", requirePhoto: true },
        { text: "28. Are staff provided with cleaning equipment & PPE?", type: "YES_NO", requirePhoto: true },
        { text: "29. Is cleaning roster displayed?", type: "YES_NO", requirePhoto: true },
        { text: "30. Is toilet water efficient?", type: "YES_NO", requirePhoto: false },
        { text: "31. Is toilet energy efficient (Solar)?", type: "YES_NO", requirePhoto: false },
        {
            text: "32. What efficiency mechanism present?",
            type: "OPTIONS",
            options: ["Water Efficient", "Solar/Energy Efficient", "Both", "None"],
            requirePhoto: true
        },
    ];

    console.log("Seeding CT Questions...");
    for (let i = 0; i < ctQuestions.length; i++) {
        await prisma.toiletInspectionQuestion.create({
            data: {
                ...ctQuestions[i],
                forType: ToiletType.CT,
                order: i + 1
            }
        });
    }

    console.log("Seeding PT Questions...");
    for (let i = 0; i < ptQuestions.length; i++) {
        await prisma.toiletInspectionQuestion.create({
            data: {
                ...ptQuestions[i],
                forType: ToiletType.PT,
                order: i + 1
            }
        });
    }

    console.log("Seeding completed successfully!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
