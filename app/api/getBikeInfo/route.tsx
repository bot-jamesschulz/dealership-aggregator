import { NextResponse } from 'next/server';
import getDealerships from './maps';
import getBikeInfo from './puppeteer';



export async function POST(request: Request) {
    
    const dealershipUrl = await getDealerships();
    const bikeInfo = await getBikeInfo(dealershipUrl);

    const searchValue = await request.json()
    //return NextResponse.json(bikeInfo);
    return NextResponse.json("bam");
}