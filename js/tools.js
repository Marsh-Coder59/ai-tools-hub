// js/tools.js

// ===============================
// Generate AI Output
// ===============================
async function generateTool(inputId, outputId, type) {
    const inputElement = document.getElementById(inputId);
    const outputElement = document.getElementById(outputId);

    if (!inputElement || !outputElement) {
        alert("Input or output element not found!");
        return;
    }

    const input = inputElement.value.trim();

    if (!input) {
        alert("Please enter input!");
        return;
    }

    outputElement.value = "Generating...";

    try {
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, type })
        });

        if (!response.ok) throw new Error("Server error: " + response.status);

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        outputElement.value = data.output || "No response from AI.";
    } catch (error) {
        console.error("AI Generation Error:", error);
        outputElement.value = "";
        alert("Error generating content: " + error.message);
    }
}

// ===============================
// Copy Output
// ===============================
function copyOutput(id) {
    const output = document.getElementById(id);
    if (!output || !output.value) {
        alert("Nothing to copy!");
        return;
    }

    navigator.clipboard.writeText(output.value)
        .then(() => alert("Copied to clipboard!"))
        .catch(() => {
            output.select();
            document.execCommand("copy");
            alert("Copied to clipboard!");
        });
}

// ===============================
// Download PDF
// ===============================
function downloadPDF(id, filename) {
    const content = document.getElementById(id).value;

    if (!content) {
        alert("Nothing to download!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("Times", "Normal");
    doc.setFontSize(12);

    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 15);

    doc.save(filename + ".pdf");

}


// ===============================
// Download DOCX - Fully Fixed
// ===============================
function downloadDoc(id, filename) {
    const content = document.getElementById(id).value;

    if (!content) {
        alert("Nothing to download!");
        return;
    }

    // Check docx library
    if (typeof docx === "undefined" || typeof saveAs === "undefined") {
        alert("Required libraries failed to load. Refresh page.");
        return;
    }

    const { Document, Packer, Paragraph, TextRun } = docx;

    // Split content into paragraphs
    const lines = content.split(/\r?\n/); // handles both \n and \r\n

    const paragraphs = lines.map(line =>
        new Paragraph({
            children: [
                new TextRun({
                    text: line || " ", // avoid empty paragraph errors
                    font: "Times New Roman",
                    size: 24 // 12pt font
                })
            ],
            spacing: { after: 200 }
        })
    );

    const doc = new Document({
        sections: [
            {
                children: paragraphs
            }
        ]
    });

    // Generate and save DOCX
    Packer.toBlob(doc)
        .then(blob => {
            saveAs(blob, filename + ".docx");
        })
        .catch(err => {
            console.error("DOCX generation error:", err);
            alert("Failed to generate DOCX. See console for details.");
        });
}

function handleDownload(outputId, fileName) {
    window.open("YOUR_MONETIZED_LINK", "_blank");

    alert("Preparing your download...");

    setTimeout(() => {
        downloadPDF(outputId, fileName);
    }, 1500);
}

// ===============================
// Navbar Toggle (Optional)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => navLinks.classList.toggle("active"));
    }
});