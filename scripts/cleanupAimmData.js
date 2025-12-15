import { db } from '../src/firebase.js';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

/**
 * Script to clean up AIMM data from all sites except sample customer
 * This removes serviceData, rollerData, specData, issues, and notes
 * while preserving basic site information
 */

// Sample customer identifiers to preserve
const SAMPLE_CUSTOMERS = [
    'Sample Customer',
    'Demo Customer',
    'Test Customer'
];

async function cleanupAimmData() {
    console.log('🧹 Starting AIMM data cleanup...');
    
    try {
        const sitesRef = collection(db, 'sites');
        const snapshot = await getDocs(sitesRef);
        
        let totalSites = 0;
        let cleanedSites = 0;
        let preservedSites = 0;
        
        for (const siteDoc of snapshot.docs) {
            const siteData = siteDoc.data();
            totalSites++;
            
            // Check if this is a sample customer site to preserve
            const isSampleCustomer = SAMPLE_CUSTOMERS.some(sampleName => 
                siteData.customer?.toLowerCase().includes(sampleName.toLowerCase()) ||
                siteData.name?.toLowerCase().includes('sample') ||
                siteData.name?.toLowerCase().includes('demo')
            );
            
            if (isSampleCustomer) {
                console.log(`🔒 Preserving sample site: ${siteData.name} (${siteData.customer})`);
                preservedSites++;
                
                // Still ensure hasAIMMProfile is properly set for sample
                if (!siteData.hasAIMMProfile) {
                    await updateDoc(doc(db, 'sites', siteDoc.id), {
                        hasAIMMProfile: true
                    });
                    console.log(`✅ Enabled AIMM profile for sample site: ${siteData.name}`);
                }
                continue;
            }
            
            // Check if site has AIMM data to clean
            const hasAimmData = (
                (siteData.serviceData && siteData.serviceData.length > 0) ||
                (siteData.rollerData && siteData.rollerData.length > 0) ||
                (siteData.specData && siteData.specData.length > 0) ||
                (siteData.issues && siteData.issues.length > 0) ||
                (siteData.notes && siteData.notes.length > 0) ||
                siteData.hasAIMMProfile === true
            );
            
            if (!hasAimmData) {
                console.log(`⏭️  Site already clean: ${siteData.name}`);
                continue;
            }
            
            // Clean up AIMM data
            const cleanedData = {
                serviceData: [],
                rollerData: [],
                specData: [],
                issues: [],
                notes: [],
                hasAIMMProfile: false
            };
            
            await updateDoc(doc(db, 'sites', siteDoc.id), cleanedData);
            console.log(`🧹 Cleaned AIMM data from: ${siteData.name} (${siteData.customer})`);
            cleanedSites++;
        }
        
        console.log('\n📊 Cleanup Summary:');
        console.log(`   Total sites processed: ${totalSites}`);
        console.log(`   Sites cleaned: ${cleanedSites}`);
        console.log(`   Sample sites preserved: ${preservedSites}`);
        console.log(`   Sites already clean: ${totalSites - cleanedSites - preservedSites}`);
        
        if (cleanedSites > 0) {
            console.log('\n✅ AIMM data cleanup completed successfully!');
        } else {
            console.log('\n✅ No AIMM data cleanup was needed.');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Run the cleanup
cleanupAimmData().catch(console.error);
