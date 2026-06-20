import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VERSES = [
  { ref: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the LORD — plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref: "Isaiah 40:31", text: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { ref: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { ref: "Joshua 1:9", text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go." },
  { ref: "Proverbs 31:25", text: "She is clothed with strength and dignity; she can laugh at the days to come." },
  { ref: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand." },
  { ref: "Psalm 46:1", text: "God is our refuge and strength, an ever-present help in trouble." },
  { ref: "Romans 8:31", text: "If God is for us, who can be against us?" },
  { ref: "Ephesians 3:20", text: "Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us." },
  { ref: "Psalm 23:1", text: "The LORD is my shepherd; I lack nothing." },
  { ref: "Matthew 6:33", text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well." },
  { ref: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline." },
  { ref: "Proverbs 3:5–6", text: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { ref: "Psalm 37:4", text: "Take delight in the LORD, and he will give you the desires of your heart." },
  { ref: "Isaiah 43:2", text: "When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you." },
  { ref: "Lamentations 3:22–23", text: "Because of the LORD's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness." },
  { ref: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit." },
  { ref: "Psalm 139:14", text: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well." },
  { ref: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see." },
  { ref: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
  { ref: "Nehemiah 8:10", text: "Do not grieve, for the joy of the LORD is your strength." },
  { ref: "Psalm 27:1", text: "The LORD is my light and my salvation — whom shall I fear? The LORD is the stronghold of my life — of whom shall I be afraid?" },
  { ref: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified, for the LORD your God goes with you; he will never leave you nor forsake you." },
  { ref: "Psalm 34:18", text: "The LORD is close to the brokenhearted and saves those who are crushed in spirit." },
  { ref: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you." },
  { ref: "Zephaniah 3:17", text: "The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will rejoice over you with singing." },
  { ref: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
  { ref: "Psalm 28:7", text: "The LORD is my strength and my shield; my heart trusts in him, and he helps me. My heart leaps for joy, and with my song I praise him." },
  { ref: "Galatians 6:9", text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up." },
  { ref: "Isaiah 26:3", text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you." },
  { ref: "Proverbs 16:3", text: "Commit to the LORD whatever you do, and he will establish your plans." },
  { ref: "John 16:33", text: "In this world you will have trouble. But take heart! I have overcome the world." },
  { ref: "Psalm 91:11", text: "For he will command his angels concerning you to guard you in all your ways." },
  { ref: "2 Chronicles 20:17", text: "Take up your positions; stand firm and see the deliverance the LORD will give you. Do not be afraid; do not be discouraged." },
  { ref: "James 1:2–4", text: "Consider it pure joy whenever you face trials of many kinds, because the testing of your faith produces perseverance." },
  { ref: "1 Corinthians 10:13", text: "God is faithful; he will not let you be tempted beyond what you can bear. But when you are tempted, he will also provide a way out." },
  { ref: "Psalm 118:14", text: "The LORD is my strength and my defense; he has become my salvation." },
];

export async function GET() {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const verse = VERSES[dayOfYear % VERSES.length];
  return NextResponse.json({ verse });
}
