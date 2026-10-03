import dotenv from 'dotenv';
dotenv.config();

import { CardRenderer } from './services/cardRenderer';
import { NewsFetcher } from './services/newsFetcher';
import { NewsItem, TemplateStyle, CardAspectRatio } from './types';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  const renderer = new CardRenderer();
  const fetcher = new NewsFetcher();

  try {
    if (command === 'test') {
      console.log('🧪 ডেমো সংবাদ দিয়ে ফটো-কার্ড টেস্ট রেন্ডার শুরু হচ্ছে...\n');

      const sampleNews: NewsItem = {
        id: 'test-123',
        title: 'প্রযুক্তির দ্রুত বিকাশে এআই বিপ্লব: বাংলাদেশেও আধুনিক মিডিয়া অটোমেশনের নতুন দিগন্ত',
        cleanTitle: 'প্রযুক্তির দ্রুত বিকাশে এআই বিপ্লব: বাংলাদেশেও মিডিয়া অটোমেশনের নতুন দিগন্ত',
        summary: 'দৈনন্দিন সংবাদ ও তথ্য সাধারণ মানুষের কাছে নিমিষেই নান্দনিক গ্রাফিক্সে পৌঁছে দিতে তৈরি হচ্ছে অত্যাধুনিক কৃত্রিম বুদ্ধিমত্তা ভিত্তিক সিস্টেম।',
        source: 'প্রথম আলো',
        sourceUrl: 'https://www.prothomalo.com/technology/article/sample-ai-revolution-bangladesh',
        imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80',
        category: 'প্রযুক্তি',
        publishedAt: new Date().toISOString()
      };

      const styles: TemplateStyle[] = ['breaking', 'editorial', 'quote'];

      for (const style of styles) {
        console.log(`🎨 টেস্টিং স্টাইল: ${style}...`);
        const result = await renderer.renderCard({
          news: sampleNews,
          style,
          aspectRatio: 'square'
        });
        console.log(`✅ [${style}] সংরক্ষিত হয়েছে: ${result.cardPath}`);
      }

      console.log('\n🎉 সব টেস্ট কার্ড সফলভাবে তৈরি হয়েছে! output ফোল্ডারে দেখতে পাবেন।');
    } else if (command === 'fetch') {
      console.log('📡 লাইভ নিউজ ফেচ করা হচ্ছে...');
      const newsList = await fetcher.fetchAllNews(24);
      console.log(`\n📋 আজকের পাওয়া খবরের তালিকা (সর্বশেষ ৫টি):`);
      newsList.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. [${item.source}] ${item.title}`);
        console.log(`   🔗 লিঙ্ক: ${item.sourceUrl}`);
        console.log(`   🕒 সময়: ${item.publishedAt}\n`);
      });
    } else {
      console.log(`অজানা কমান্ড: ${command}. কমান্ডসমূহ: test, fetch`);
    }
  } catch (error: any) {
    console.error('❌ ত্রুটি:', error.message);
  } finally {
    await renderer.close();
  }
}

main();
