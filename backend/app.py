
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from PIL import Image
import os
import io
import json

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "project": "Food Verse AI"
    })


def get_json_data():
    return request.get_json(silent=True) or {}


@app.post("/api/analyze-food")
def analyze_food():
    uploaded = request.files.get("image")

    if not uploaded or not uploaded.filename:
        return jsonify({"error": "Please upload a food image."}), 400

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return jsonify({
            "error": "GEMINI_API_KEY is missing. Set it in the backend terminal."
        }), 503

    try:
        image_bytes = uploaded.read()

        if not image_bytes:
            return jsonify({"error": "The uploaded image is empty."}), 400

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            mime_type = Image.MIME.get(image.format, "image/jpeg")
        except Exception:
            return jsonify({
                "error": "Invalid image. Please upload a JPG, PNG or WEBP file."
            }), 400

        client = genai.Client(api_key=api_key)

        prompt = """
You are Food Verse AI, a food image analysis assistant.
Analyze the uploaded image and return ONLY valid JSON with:
food_name: string
category: string
visible_ingredients: array of strings
visual_observations: array of strings
nutrition_estimate: object containing calories_kcal, protein_g,
carbohydrates_g, fat_g, assumptions
freshness_observations: string
confidence: low, medium, or high
limitations: array of strings

Identify only what is reasonably visible. Nutrition values are rough
estimates and must state portion assumptions. Never claim an image
proves food is safe, fresh, or free from contamination.
If uncertain, clearly say so.
"""

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        if not response.text:
            raise ValueError("The AI returned an empty response.")

        analysis = json.loads(response.text)

        return jsonify({
            "success": True,
            "analysis_type": "gemini_vision",
            "analysis": analysis
        })

    except Exception as exc:
        app.logger.exception("Food image analysis failed")
        return jsonify({
            "error": "Food image analysis could not be completed.",
            "details": str(exc)[:300]
        }), 502


@app.post("/api/recipe")
def recipe():
    data = get_json_data()
    ingredients_text = str(data.get("ingredients") or "").strip()
    dietary = str(data.get("dietary") or "No preference").strip()

    if not ingredients_text:
        return jsonify({
            "error": "Enter your ingredients first, separated by commas."
        }), 400

    ingredients = list(dict.fromkeys(
        item.strip()
        for item in ingredients_text.split(",")
        if item.strip()
    ))

    if not ingredients:
        return jsonify({"error": "Enter at least one ingredient."}), 400

    main_ingredients = ingredients[:4]
    title = " + ".join(main_ingredients).title() + " Quick Dish"

    steps = [
        "Wash and prepare: " + ", ".join(ingredients) + ".",
        "Heat a pan with a little suitable cooking oil or water.",
        "Add the ingredients that need the longest cooking time first.",
        "Add the remaining ingredients and season to taste.",
        "Cook until all ingredients are properly cooked, then serve."
    ]

    if dietary == "Vegan":
        dietary_note = (
            "Use plant-based ingredients only. Avoid dairy, eggs, "
            "honey and other animal-derived additions."
        )
    elif dietary == "Vegetarian":
        dietary_note = (
            "Keep the dish vegetarian and check packaged ingredients "
            "for any non-vegetarian additives."
        )
    elif dietary == "Egg-free":
        dietary_note = "Do not add eggs; check packaged ingredients for egg."
    elif dietary == "Dairy-free":
        dietary_note = "Avoid milk, butter, cheese and other dairy products."
    else:
        dietary_note = "Adjust seasoning and serving size to your preference."

    return jsonify({
        "success": True,
        "source": "ingredient_based_recipe",
        "title": title,
        "ingredients": ingredients,
        "dietary_preference": dietary,
        "steps": steps,
        "dietary_note": dietary_note,
        "note": (
            "This is a simple ingredient-based recipe idea, not a "
            "recipe generated by the vision model. Check allergies "
            "and make sure food is cooked properly."
        )
    })


@app.post("/api/nutrition")
def nutrition():
    data = get_json_data()
    goal = str(data.get("goal") or "Balanced meals").strip()
    dietary = str(data.get("dietary") or "No preference").strip()

    suggestions_by_goal = {
        "Balanced meals": [
            "Include vegetables or fruit in meals across the day.",
            "Combine a suitable protein source with grains and vegetables.",
            "Choose a variety of foods instead of relying on one food group."
        ],
        "More plant-based foods": [
            "Try beans, chickpeas, lentils, tofu or other suitable plant proteins.",
            "Add different-coloured vegetables and fruits to meals.",
            "Use nuts, seeds and whole grains where suitable."
        ],
        "Higher-protein meal ideas": [
            "Consider beans, lentils, tofu, dairy or eggs if they fit your diet.",
            "Include a protein-containing food in meals and snacks.",
            "Vary protein sources throughout the week."
        ],
        "Simple budget-friendly meals": [
            "Plan meals around affordable staples such as rice, oats or roti.",
            "Use seasonal vegetables and beans or lentils where suitable.",
            "Prepare a little extra food when safe storage is available."
        ]
    }

    suggestions = suggestions_by_goal.get(
        goal, suggestions_by_goal["Balanced meals"]
    )

    if dietary == "Vegan":
        suggestions.append(
            "Choose plant-based foods and check that packaged products are vegan."
        )
    elif dietary == "Vegetarian":
        suggestions.append(
            "Choose suitable vegetarian protein sources such as beans, lentils or dairy."
        )
    elif dietary == "Egg-free":
        suggestions.append(
            "Check ingredient labels for egg in packaged foods."
        )
    elif dietary == "Dairy-free":
        suggestions.append(
            "Choose dairy-free alternatives that suit your needs."
        )

    return jsonify({
        "success": True,
        "source": "goal_based_guidance",
        "title": "Meal ideas: " + goal,
        "goal": goal,
        "dietary_preference": dietary,
        "suggestions": suggestions,
        "note": (
            "General food-planning guidance, not a personalized "
            "medical or calorie prescription."
        )
    })


@app.post("/api/hygiene")
def hygiene():
    return jsonify({
        "success": True,
        "source": "food_safety_checklist",
        "title": "Kitchen Hygiene Checklist",
        "checks": [
            {
                "label": "Clean surfaces and utensils",
                "status": "Clean before and after food preparation."
            },
            {
                "label": "Separate raw and ready-to-eat foods",
                "status": "Use separate boards or utensils where possible."
            },
            {
                "label": "Wash hands",
                "status": "Wash hands with soap before handling food."
            },
            {
                "label": "Cook thoroughly",
                "status": "Cook foods to an appropriate safe temperature."
            },
            {
                "label": "Store food safely",
                "status": "Refrigerate perishable food promptly."
            }
        ],
        "note": (
            "This is a general checklist, not an automated inspection "
            "of the uploaded food."
        )
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
